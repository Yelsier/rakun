import { getPlatform, parseRealtimeTopics } from '../platform'
import type { RakunRequestContext } from './context'
import { recordApiError } from './operations'

export type RealtimeSubscriptionAuthorization =
  | { ok: true; topics: string[] }
  | { ok: false; message: string; status: number }

const rejectRealtimeSubscription = async ({
  ctx,
  message,
  status,
}: {
  ctx: RakunRequestContext
  message: string
  status: number
}): Promise<RealtimeSubscriptionAuthorization> => {
  await recordApiError({
    name: 'manager.realtime.subscribe',
    ctx,
    error: new Error(message),
    statusCode: status,
    boundary: true,
  })

  return { ok: false, message, status }
}

export const authorizeRealtimeSubscription = async ({
  ctx,
  requestUrl,
}: {
  ctx: RakunRequestContext
  requestUrl: string | URL
}): Promise<RealtimeSubscriptionAuthorization> => {
  if (!ctx.user) {
    return await rejectRealtimeSubscription({
      ctx,
      message: 'Authentication required',
      status: 401,
    })
  }

  const topics = parseRealtimeTopics(requestUrl)
  if (!topics) {
    return await rejectRealtimeSubscription({
      ctx,
      message: 'Invalid realtime topic',
      status: 400,
    })
  }

  if (getPlatform().realtime.metadata.transport !== 'sse') {
    return await rejectRealtimeSubscription({
      ctx,
      message: 'SSE realtime is not configured',
      status: 409,
    })
  }

  return { ok: true, topics }
}
