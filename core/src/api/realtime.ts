import {
  getCollaborationRoomReferenceFromTopic,
  getCollaborationService,
  type CollaborationPresence,
  type CollaborationRoomReference,
} from '../collaboration'
import { throwAppError, getAppErrorStatusCode } from '../lib/errors'
import {
  getPlatform,
  parseRealtimePresenceBindings,
  parseRealtimeTopics,
  type RealtimeSubscriptionLifecycle,
} from '../platform'
import type { RakunRequestContext } from './context'
import { recordApiError } from './operations'
import { requireTemplateUpdate } from './routes/manager/template'
import { checkOwnership } from './utils/checkOwnership'
import { requireContentType } from './utils/requireContentType'

export type RealtimeSubscriptionAuthorization =
  | {
      ok: true
      topics: string[]
      lifecycle?: RealtimeSubscriptionLifecycle
    }
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

  const presenceBindings = parseRealtimePresenceBindings(requestUrl, topics)
  if (!presenceBindings) {
    return await rejectRealtimeSubscription({
      ctx,
      message: 'Invalid realtime presence binding',
      status: 400,
    })
  }

  if (!presenceBindings.length) return { ok: true, topics }

  const references = presenceBindings.map(({ topic, clientId }) => ({
    clientId,
    topic,
    reference: getCollaborationRoomReferenceFromTopic(topic),
  }))
  const resolvedReferences = references.filter(
    (
      value,
    ): value is typeof value & { reference: CollaborationRoomReference } =>
      value.reference !== null,
  )
  if (resolvedReferences.length !== references.length) {
    return await rejectRealtimeSubscription({
      ctx,
      message: 'Invalid collaboration presence topic',
      status: 400,
    })
  }

  try {
    for (const { reference } of resolvedReferences) {
      const contentType = requireContentType(reference.contentType)
      if (reference.resource === 'content') {
        await checkOwnership({
          ctx,
          contentType,
          id: reference.documentId ?? '',
          permission: 'updateAny',
        })
      } else {
        if (!contentType.hasTemplate) {
          throwAppError('FEATURE_UNSUPPORTED', { feature: 'template' })
        }
        requireTemplateUpdate(contentType, ctx)
      }
    }
  } catch (error) {
    return await rejectRealtimeSubscription({
      ctx,
      message: 'Collaboration presence subscription not authorized',
      status: getAppErrorStatusCode(error) ?? 500,
    })
  }

  const user = ctx.getUser()
  const connectionId = getPlatform().crypto.randomUUID()
  const updateConnections = async (active: boolean) => {
    const service = getCollaborationService()
    await Promise.all(
      resolvedReferences.map(async ({ clientId, topic, reference }) => {
        const participant: CollaborationPresence = {
          clientId,
          userId: user._id,
          user: user.user,
          name: user.name,
          avatar:
            user.avatarUrl || user.avatarPreviewUrl
              ? {
                  url: user.avatarUrl,
                  previewUrl: user.avatarPreviewUrl,
                }
              : null,
        }
        const changed = await service.setPresenceConnection({
          roomId: reference.roomId,
          connectionId,
          participant,
          active,
        })
        if (changed) getPlatform().realtime.publish(topic)
      }),
    )
  }

  await updateConnections(true)

  const updateConnectionsInBackground = (active: boolean) => {
    void updateConnections(active).catch((error) =>
      recordApiError({
        name: 'manager.realtime.subscribe',
        ctx,
        error,
        statusCode: 500,
        boundary: true,
      }).catch(() => undefined),
    )
  }

  return {
    ok: true,
    topics,
    lifecycle: {
      heartbeat: () => {
        updateConnectionsInBackground(true)
      },
      close: () => {
        updateConnectionsInBackground(false)
      },
    },
  }
}
