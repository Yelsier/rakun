import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'

import {
  authorizeRealtimeSubscription,
  createRakunOperationDefinitions,
  createRealtimeSseStream,
  createRequestContext,
  ensureRakunInitialized,
  getPlatform,
  getRakunBootstrapOptions,
  handleMediaBinaryUpload,
  parseCookieHeader,
  recordApiError,
  runContentHookContext,
  type AnyRakunOperation,
  type MediaBinaryUploadRequest,
  type MediaBinaryUploadResponse,
  type RakunRequestContext,
} from '@rakun-kit/core'
import {
  getAppErrorShape,
  getAppErrorStatusCode,
  isAppError,
  throwAppError,
} from '@rakun-kit/core/errors'

import {
  createResponseHeaderAdapter,
  headersToObject,
  jsonResponse,
  searchParamsToObject,
} from './http'

const hasIssues = (error: unknown): error is { issues: unknown[]; message?: string } =>
  Boolean(
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray((error as { issues?: unknown }).issues)
  )

const getAllowedOrigins = (): string[] =>
  (process.env.MANAGER_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const assertAllowedMutationOrigin = (operation: AnyRakunOperation, request: Request): void => {
  if (operation.kind !== 'mutation') return
  const origin = request.headers.get('origin')
  if (!origin || getAllowedOrigins().includes(origin)) return

  let originUrl: URL
  try {
    originUrl = new URL(origin)
  } catch {
    throwAppError('FORBIDDEN', { reason: 'INVALID_ORIGIN' })
  }

  const allowedHosts = [
    request.headers.get('host'),
    request.headers.get('x-forwarded-host'),
  ].filter(Boolean)
  if (allowedHosts.includes(originUrl.host)) return

  const baseDomain = process.env.BASE_DOMAIN
  if (
    baseDomain &&
    (originUrl.hostname === baseDomain || originUrl.hostname.endsWith(`.${baseDomain}`))
  ) {
    return
  }

  throwAppError('FORBIDDEN', { reason: 'INVALID_ORIGIN' })
}

const readOperationInput = async (operation: AnyRakunOperation, request: Request) => {
  if (!operation.input) return undefined
  if (operation.method === 'get') {
    return operation.input.parse(searchParamsToObject(new URL(request.url)))
  }
  const raw = await request.text()
  return operation.input.parse(raw.trim() ? JSON.parse(raw) : undefined)
}

const createContext = async (
  request: Request,
  headers = new Headers()
): Promise<RakunRequestContext> =>
  await createRequestContext({
    headers: headersToObject(request.headers),
    cookies: parseCookieHeader(request.headers.get('cookie') ?? undefined),
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    res: createResponseHeaderAdapter(headers),
  })

const operationResponse = async (
  operation: AnyRakunOperation,
  request: Request,
  onContext: (context: RakunRequestContext) => void
): Promise<Response> => {
  assertAllowedMutationOrigin(operation, request)
  const headers = new Headers()
  const context = await createContext(request, headers)
  onContext(context)
  if (operation.access === 'auth') context.getUser()

  const result = await runContentHookContext({ requestContext: context }, async () => {
    const input = await readOperationInput(operation, request)
    const parsed = operation.output.parse(await operation.resolve({ ctx: context, input }))
    await operation.onSuccess?.({ ctx: context, result: parsed })
    return parsed
  })

  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(result), { headers })
}

const handleRealtime = async (request: Request): Promise<Response> => {
  const context = await createContext(request)
  const authorization = await authorizeRealtimeSubscription({
    ctx: context,
    requestUrl: request.url,
  })
  if (!authorization.ok) {
    return jsonResponse({ message: authorization.message }, authorization.status)
  }

  return new Response(
    createRealtimeSseStream({
      lifecycle: authorization.lifecycle,
      realtime: getPlatform().realtime,
      signal: request.signal,
      topics: authorization.topics,
    }),
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    }
  )
}

const handleBinaryUpload = async (request: Request): Promise<Response> => {
  const input = Buffer.from(await request.arrayBuffer())
  const stream = Readable.from(input.length > 0 ? [input] : [])
  const uploadRequest = Object.assign(stream, {
    headers: headersToObject(request.headers),
  }) as MediaBinaryUploadRequest
  const headers = new Headers()
  let statusCode = 200
  let body: string | Uint8Array | undefined
  const headerAdapter = createResponseHeaderAdapter(headers)
  const uploadResponse = {
    get statusCode() {
      return statusCode
    },
    set statusCode(value: number | undefined) {
      statusCode = value ?? 200
    },
    setHeader: headerAdapter.setHeader,
    cookie: headerAdapter.cookie,
    end(chunk?: string | Uint8Array) {
      body = chunk
    },
  } as MediaBinaryUploadResponse

  await handleMediaBinaryUpload(uploadRequest, uploadResponse)
  const responseBody = typeof body === 'string' ? body : body ? Uint8Array.from(body).buffer : null
  return new Response(responseBody, { status: statusCode, headers })
}

export type RakunApiHandler = (request: Request, segments: string[]) => Promise<Response>

export const createRakunApiHandler = (): RakunApiHandler => {
  let operations: Map<string, AnyRakunOperation> | undefined

  return async (request, segments) => {
    await ensureRakunInitialized()
    const operationPath = segments.join('/')
    const realtime = getPlatform().realtime.metadata

    if (
      request.method === 'GET' &&
      realtime.transport === 'sse' &&
      operationPath === realtime.endpoint.replace(/^\/+/, '')
    ) {
      try {
        return await handleRealtime(request)
      } catch (error) {
        await recordApiError({
          name: 'manager.realtime.subscribe',
          error,
          statusCode: 500,
          boundary: true,
        })
        return jsonResponse({ message: 'Internal server error' }, 500)
      }
    }

    if (
      request.method === 'POST' &&
      operationPath === 'media/upload' &&
      getRakunBootstrapOptions()?.media
    ) {
      return await handleBinaryUpload(request)
    }

    operations ??= new Map(
      Object.entries(createRakunOperationDefinitions()).map(([name, operation]) => [
        name.replace(/\./g, '/'),
        operation,
      ])
    )
    const operation = operations.get(operationPath)
    if (!operation) return jsonResponse({ message: 'Route not found' }, 404)
    if (request.method.toLowerCase() !== operation.method) {
      return jsonResponse(
        { message: `Method ${request.method} is not allowed for this route` },
        405
      )
    }

    let context: RakunRequestContext | undefined
    try {
      return await operationResponse(operation, request, (value) => {
        context = value
      })
    } catch (error) {
      const statusCode = isAppError(error)
        ? (getAppErrorStatusCode(error) ?? 500)
        : hasIssues(error)
          ? 400
          : 500
      await recordApiError({
        name: operationPath.replace(/\//g, '.'),
        operation,
        ctx: context,
        error,
        boundary: true,
        statusCode,
      })

      if (isAppError(error)) {
        return jsonResponse(
          { message: error.message, appError: getAppErrorShape(error) },
          statusCode
        )
      }
      if (hasIssues(error)) {
        return jsonResponse(
          { message: error.message ?? 'Invalid input', issues: error.issues },
          400
        )
      }
      return jsonResponse({ message: 'Internal server error' }, 500)
    }
  }
}
