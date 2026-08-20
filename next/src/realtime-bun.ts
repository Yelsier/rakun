import { ensureRakunInitialized, getPlatform, recordApiError } from '@rakun-kit/core'

import { authorizeRakunRealtimeRequest, type RakunRealtimeWebSocket } from './realtime'

type BunRealtimeSocketData = {
  topic: string
}

type BunRealtimeServer = {
  upgrade(request: Request, options: { data: BunRealtimeSocketData }): boolean
}

type BunRealtimeSocket = RakunRealtimeWebSocket & {
  data: BunRealtimeSocketData
}

export type RakunBunWebSocketOptions = {
  fallback?: (request: Request) => Promise<Response> | Response
  path?: string
}

export const createRakunBunWebSocketServerOptions = (options: RakunBunWebSocketOptions = {}) => {
  const path = new URL(options.path ?? '/api/realtime/ws', 'http://rakun.local').pathname
  const subscriptions = new WeakMap<object, () => void>()

  return {
    async fetch(request: Request, server: BunRealtimeServer): Promise<Response | undefined> {
      if (new URL(request.url).pathname !== path) {
        return options.fallback
          ? await options.fallback(request)
          : new Response('Not found', { status: 404 })
      }

      try {
        await ensureRakunInitialized()
        const authorization = await authorizeRakunRealtimeRequest(request, 'websocket')
        if (authorization instanceof Response) return authorization
        if (server.upgrade(request, { data: { topic: authorization.topic } })) {
          return undefined
        }
        await recordApiError({
          name: 'manager.realtime.upgrade',
          error: new Error('WebSocket upgrade failed'),
          statusCode: 400,
          boundary: true,
        })
        return new Response('WebSocket upgrade failed', { status: 400 })
      } catch (error) {
        await recordApiError({
          name: 'manager.realtime.upgrade',
          error,
          statusCode: 500,
          boundary: true,
        })
        return new Response('WebSocket upgrade failed', { status: 500 })
      }
    },
    websocket: {
      data: {} as BunRealtimeSocketData,
      open(socket: BunRealtimeSocket) {
        subscriptions.set(
          socket,
          getPlatform().realtime.subscribe(socket.data.topic, () => {
            socket.send(JSON.stringify({ topic: socket.data.topic }))
          })
        )
      },
      close(socket: BunRealtimeSocket) {
        subscriptions.get(socket)?.()
        subscriptions.delete(socket)
      },
    },
  }
}
