import {
  authorizeRealtimeSubscription,
  createRequestContext,
  createRealtimeSseStream,
  getPlatform,
  isRealtimeEndpointRequest,
  parseCookieHeader,
  recordApiError,
  type RakunRequestContext,
  type RealtimeProvider,
  type RealtimeSubscriptionLifecycle,
} from '@rakun-kit/core'

import type { RakunNextIntegration } from './shared'
import { createResponseHeaderAdapter, headersToObject } from './shared'

export type RakunNextRealtimeOptions = {
  heartbeatMs?: number
}

const createRealtimeRequestContext = async (request: Request): Promise<RakunRequestContext> => {
  const headers = new Headers()

  return await createRequestContext({
    headers: headersToObject(request.headers),
    cookies: parseCookieHeader(request.headers.get('cookie') ?? undefined),
    res: createResponseHeaderAdapter(headers),
  })
}

export const authorizeRakunRealtimeRequest = async (
  request: Request
): Promise<
  | {
      ctx: RakunRequestContext
      topics: string[]
      lifecycle?: RealtimeSubscriptionLifecycle
    }
  | Response
> => {
  const ctx = await createRealtimeRequestContext(request)
  const authorization = await authorizeRealtimeSubscription({
    ctx,
    requestUrl: request.url,
  })

  return authorization.ok
    ? { ctx, topics: authorization.topics, lifecycle: authorization.lifecycle }
    : Response.json({ message: authorization.message }, { status: authorization.status })
}

export const createRakunSseStream = ({
  heartbeatMs,
  realtime,
  signal,
  lifecycle,
  topic,
  topics,
}: {
  heartbeatMs?: number
  realtime: RealtimeProvider
  signal?: AbortSignal
  lifecycle?: Parameters<typeof createRealtimeSseStream>[0]['lifecycle']
  topic?: string
  topics?: readonly string[]
}): ReadableStream<Uint8Array> => {
  return createRealtimeSseStream({
    heartbeatMs,
    lifecycle,
    realtime,
    signal,
    topics: topics ?? (topic ? [topic] : []),
  })
}

export const createRakunSseResponse = async (
  request: Request,
  options: RakunNextRealtimeOptions = {}
): Promise<Response> => {
  const authorization = await authorizeRakunRealtimeRequest(request)

  if (authorization instanceof Response) return authorization

  return new Response(
    createRakunSseStream({
      heartbeatMs: options.heartbeatMs,
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

export const isRakunSseRequest = (
  request: Request,
  endpoint: string,
  basePath?: string
): boolean => {
  return isRealtimeEndpointRequest({
    basePath,
    endpoint,
    method: request.method,
    requestUrl: request.url,
  })
}

const getRakunApiBasePath = (request: Request, segments: readonly string[]): string => {
  const requestSegments = new URL(request.url).pathname.split('/').filter(Boolean)
  const baseSegments = requestSegments.slice(
    0,
    Math.max(0, requestSegments.length - segments.length)
  )
  return baseSegments.length > 0 ? `/${baseSegments.join('/')}` : ''
}

export const rakunNextRealtime = (options: RakunNextRealtimeOptions = {}): RakunNextIntegration => {
  return async ({ request, segments }) => {
    const metadata = getPlatform().realtime.metadata
    const basePath = getRakunApiBasePath(request, segments)

    if (metadata.transport !== 'sse' || !isRakunSseRequest(request, metadata.endpoint, basePath)) {
      return null
    }

    try {
      return await createRakunSseResponse(request, options)
    } catch (error) {
      await recordApiError({
        name: 'manager.realtime.subscribe',
        error,
        statusCode: 500,
        boundary: true,
      })
      throw error
    }
  }
}
