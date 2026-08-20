import { ensureRakunInitialized, getPlatform, recordApiError } from '@rakun-kit/core'
import type { IncomingMessage, Server as NodeHttpServer } from 'node:http'
import type { Duplex } from 'node:stream'

import { authorizeRakunRealtimeRequest } from './realtime'

export type RakunNodeWebSocketOptions = {
  path?: string
  server: NodeHttpServer
}

export const attachRakunNodeWebSocketServer = async ({
  path = '/api/realtime/ws',
  server,
}: RakunNodeWebSocketOptions): Promise<{ close: () => Promise<void> }> => {
  const { WebSocketServer } = await import('ws')
  const webSocketServer = new WebSocketServer({ noServer: true })
  const normalizedPath = new URL(path, 'http://rakun.local').pathname

  const upgrade = async (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const host = request.headers.host ?? 'localhost'
    const protocol = (request.socket as { encrypted?: boolean }).encrypted ? 'https' : 'http'
    const requestHeaders = new Headers()
    for (const [name, value] of Object.entries(request.headers)) {
      for (const part of Array.isArray(value) ? value : [value]) {
        if (part !== undefined) requestHeaders.append(name, part)
      }
    }
    const fetchRequest = new Request(`${protocol}://${host}${request.url ?? '/'}`, {
      headers: requestHeaders,
    })
    if (new URL(fetchRequest.url).pathname !== normalizedPath) return

    try {
      await ensureRakunInitialized()
      const authorization = await authorizeRakunRealtimeRequest(fetchRequest, 'websocket')
      if (authorization instanceof Response) {
        socket.write(`HTTP/1.1 ${authorization.status} Rejected\r\nConnection: close\r\n\r\n`)
        socket.destroy()
        return
      }

      webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        const unsubscribe = getPlatform().realtime.subscribe(authorization.topic, () => {
          webSocket.send(JSON.stringify({ topic: authorization.topic }))
        })
        webSocket.once('close', unsubscribe)
      })
    } catch (error) {
      await recordApiError({
        name: 'manager.realtime.upgrade',
        error,
        statusCode: 500,
        boundary: true,
      })
      socket.destroy()
    }
  }

  server.on('upgrade', upgrade)
  return {
    close: async () => {
      server.off('upgrade', upgrade)
      await new Promise<void>((resolve, reject) => {
        webSocketServer.close((error) => (error ? reject(error) : resolve()))
      })
    },
  }
}
