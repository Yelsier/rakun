import {
  createRequestContext,
  getPlatform,
  parseCookieHeader,
  recordApiError,
  type RakunRequestContext,
} from '@rakun-kit/core'

import type { RakunNextIntegration } from './shared'
import { createResponseHeaderAdapter, headersToObject, normalizePathSegments } from './shared'

const DEFAULT_HEARTBEAT_MS = 15_000
const MAX_TOPIC_LENGTH = 2_048

export type RakunNextRealtimeOptions = {
  heartbeatMs?: number
  path?: string
}

const createRealtimeRequestContext = async (request: Request): Promise<RakunRequestContext> => {
  const headers = new Headers()
  return await createRequestContext({
    headers: headersToObject(request.headers),
    cookies: parseCookieHeader(request.headers.get('cookie') ?? undefined),
    res: createResponseHeaderAdapter(headers),
  })
}

const realtimeError = async ({
  ctx,
  message,
  status,
}: {
  ctx?: RakunRequestContext
  message: string
  status: number
}): Promise<Response> => {
  const error = new Error(message)
  await recordApiError({
    name: 'manager.realtime.subscribe',
    ctx,
    error,
    statusCode: status,
    boundary: true,
  })
  return Response.json({ message }, { status })
}

export const authorizeRakunRealtimeRequest = async (
  request: Request,
  transport: 'sse' | 'websocket'
): Promise<{ ctx: RakunRequestContext; topic: string } | Response> => {
  const ctx = await createRealtimeRequestContext(request)
  if (!ctx.user) {
    return await realtimeError({ ctx, message: 'Authentication required', status: 401 })
  }

  const topic = new URL(request.url).searchParams.get('topic')?.trim()
  if (!topic || topic.length > MAX_TOPIC_LENGTH) {
    return await realtimeError({ ctx, message: 'Invalid realtime topic', status: 400 })
  }

  if (getPlatform().realtime.metadata.transport !== transport) {
    return await realtimeError({
      ctx,
      message: `${transport === 'sse' ? 'SSE' : 'WebSocket'} realtime is not configured`,
      status: 409,
    })
  }

  return { ctx, topic }
}

export const createRakunSseResponse = async (
  request: Request,
  options: Pick<RakunNextRealtimeOptions, 'heartbeatMs'> = {}
): Promise<Response> => {
  const authorization = await authorizeRakunRealtimeRequest(request, 'sse')
  if (authorization instanceof Response) return authorization
  const { topic } = authorization
  const realtime = getPlatform().realtime

  const encoder = new TextEncoder()
  const heartbeatMs = Math.max(1_000, options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS)
  let sequence = 0
  let cleanup: () => void = () => undefined

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let active = true
      const send = () => {
        if (!active) return
        sequence += 1
        controller.enqueue(
          encoder.encode(`id: ${sequence}\ndata: ${JSON.stringify({ topic })}\n\n`)
        )
      }
      const unsubscribe = realtime.subscribe(topic, send)
      const heartbeat = setInterval(() => {
        if (active) controller.enqueue(encoder.encode(': heartbeat\n\n'))
      }, heartbeatMs)
      const close = () => {
        if (!active) return
        active = false
        clearInterval(heartbeat)
        unsubscribe()
      }

      cleanup = close
      request.signal.addEventListener('abort', close, { once: true })
      controller.enqueue(encoder.encode(': connected\n\n'))
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  })
}

export type RakunRealtimeWebSocket = {
  close(code?: number, reason?: string): void
  send(data: string): unknown
}

export const subscribeRakunWebSocket = async (
  request: Request,
  socket: RakunRealtimeWebSocket
): Promise<() => void> => {
  const authorization = await authorizeRakunRealtimeRequest(request, 'websocket')
  if (authorization instanceof Response) {
    socket.close(authorization.status === 401 ? 4401 : 4400, 'Realtime subscription rejected')
    return () => undefined
  }

  const { topic } = authorization
  return getPlatform().realtime.subscribe(topic, () => {
    socket.send(JSON.stringify({ topic }))
  })
}

export const rakunNextRealtime = (options: RakunNextRealtimeOptions = {}): RakunNextIntegration => {
  const path = normalizePathSegments(options.path ?? 'realtime/events')

  return async ({ request, segments }) => {
    if (request.method !== 'GET' || segments.join('/') !== path.join('/')) {
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
