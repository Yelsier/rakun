import {
  authorizeRealtimeSubscription,
  createRealtimeSseStream,
  createRequestContext,
  getPlatform,
  isRealtimeEndpointRequest,
  parseCookieHeader,
  recordApiError,
  type RakunRequestContext,
} from '@rakun-kit/core'
import type { Request, Response, Router } from 'express'
import { Readable } from 'node:stream'

import type { RakunExpressIntegration } from './index'

export type RakunExpressRealtimeOptions = {
  heartbeatMs?: number
}

type RealtimeRequestInput = {
  headers: Record<string, string | string[] | undefined>
  ip?: string
  requestUrl: string
  response: NonNullable<RakunRequestContext['res']>
}

export const authorizeRakunExpressRealtimeRequest = async (input: RealtimeRequestInput) => {
  const ctx = await createRequestContext({
    headers: input.headers,
    cookies: parseCookieHeader(
      Array.isArray(input.headers.cookie) ? input.headers.cookie[0] : input.headers.cookie
    ),
    ip: input.ip,
    res: input.response,
  })
  const authorization = await authorizeRealtimeSubscription({
    ctx,
    requestUrl: input.requestUrl,
  })

  return { authorization, ctx }
}

const getExpressRequestUrl = (request: Request): string => {
  return request.originalUrl || request.url
}

export const rakunExpressRealtime = (
  options: RakunExpressRealtimeOptions = {}
): RakunExpressIntegration => {
  return (router: Router) => {
    router.use(async (request, response, next) => {
      const metadata = getPlatform().realtime.metadata
      const requestUrl = getExpressRequestUrl(request)

      if (
        metadata.transport !== 'sse' ||
        !isRealtimeEndpointRequest({
          basePath: request.baseUrl,
          endpoint: metadata.endpoint,
          method: request.method,
          requestUrl,
        })
      ) {
        next()
        return
      }

      try {
        const { authorization } = await authorizeRakunExpressRealtimeRequest({
          headers: request.headers,
          ip: request.ip || request.socket.remoteAddress,
          requestUrl,
          response: {
            setHeader: response.setHeader.bind(response),
            cookie: response.cookie.bind(response),
          },
        })

        if (!authorization.ok) {
          response.status(authorization.status).json({ message: authorization.message })
          return
        }

        response.status(200)
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.setHeader('Connection', 'keep-alive')
        response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        response.setHeader('X-Accel-Buffering', 'no')
        response.flushHeaders()

        const abortController = new AbortController()
        const stream = Readable.fromWeb(
          createRealtimeSseStream({
            heartbeatMs: options.heartbeatMs,
            lifecycle: authorization.lifecycle,
            realtime: getPlatform().realtime,
            signal: abortController.signal,
            topics: authorization.topics,
          })
        )
        response.once('close', () => {
          abortController.abort()
          stream.destroy()
        })
        stream.once('error', (error) => {
          void recordApiError({
            name: 'manager.realtime.subscribe',
            error,
            statusCode: 500,
            boundary: true,
          }).finally(() => response.destroy(error))
        })
        stream.pipe(response)
      } catch (error) {
        await recordApiError({
          name: 'manager.realtime.subscribe',
          error,
          statusCode: 500,
          boundary: true,
        })
        next(error)
      }
    })
  }
}
