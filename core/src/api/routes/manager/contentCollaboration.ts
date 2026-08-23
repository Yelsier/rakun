import {
  getCollaborationService,
  getContentCollaborationRoomId,
} from '../../../collaboration'
import type ContentType from '../../../lib/ContentType'
import { getMongoService } from '../../../orm'
import { collaborationRealtimeTopic, getPlatform } from '../../../platform'
import type {
  ContentCollaborationReferenceInput,
  SaveContentCollaborationOutput,
  SyncContentCollaborationInput,
  SyncContentCollaborationOutput,
} from '../../../schemas/manager/contentCollaboration'
import type { RakunRequestContext } from '../../context'
import { checkOwnership } from '../../utils/checkOwnership'
import { requireContentType } from '../../utils/requireContentType'
import { decodeBinary, encodeBinary } from './collaborationBinary'
import { updateHandler } from './update'

const editableMetadataFields = ['_bindings', '_type', '_visibility'] as const

export { getContentCollaborationRoomId }

export const toEditableContentSnapshot = (
  contentType: ContentType,
  document: Record<string, unknown>,
) => {
  const fieldNames = new Set([
    ...Object.keys(contentType.fields),
    ...editableMetadataFields,
  ])

  return Object.fromEntries(
    Object.entries(document).filter(
      ([key, value]) => fieldNames.has(key) && value !== undefined,
    ),
  )
}

const getAuthorizedDocument = async ({
  input,
  ctx,
}: {
  input: ContentCollaborationReferenceInput
  ctx: RakunRequestContext
}) => {
  const contentType = requireContentType(input.contentType)
  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: 'updateAny',
  })

  const db = await getMongoService()
  const document = (await db.get(contentType, input.documentId)) as Record<
    string,
    unknown
  >
  return { contentType, document }
}

export const syncContentCollaborationHandler = async ({
  input,
  ctx,
}: {
  input: SyncContentCollaborationInput
  ctx: RakunRequestContext
}): Promise<SyncContentCollaborationOutput> => {
  const { contentType, document } = await getAuthorizedDocument({ input, ctx })
  const user = ctx.getUser()
  const update = decodeBinary(input.update)
  const result = await getCollaborationService().sync({
    roomId: getContentCollaborationRoomId(input.contentType, input.documentId),
    initialSnapshot: toEditableContentSnapshot(contentType, document),
    stateVector: decodeBinary(input.stateVector),
    update,
    presence: input.presence
      ? {
          ...input.presence,
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
          fieldId: input.presence.fieldId ?? undefined,
        }
      : undefined,
  })

  if (update?.length || result.presenceChanged) {
    getPlatform().realtime.publish(
      collaborationRealtimeTopic('content', input.contentType, input.documentId),
    )
  }

  return {
    update: encodeBinary(result.update),
    savedStateVector: encodeBinary(result.savedStateVector),
    presence: result.presence,
  }
}

export const saveContentCollaborationHandler = async ({
  input,
  ctx,
}: {
  input: ContentCollaborationReferenceInput
  ctx: RakunRequestContext
}): Promise<SaveContentCollaborationOutput> => {
  const { contentType, document } = await getAuthorizedDocument({ input, ctx })
  const saved = await getCollaborationService().snapshot({
    roomId: getContentCollaborationRoomId(input.contentType, input.documentId),
    initialSnapshot: toEditableContentSnapshot(contentType, document),
    save: async (snapshot) =>
      await updateHandler({
        input: {
          contentType: input.contentType,
          id: input.documentId,
          data: snapshot,
        },
        ctx,
      }),
  })

  return {
    document: saved.result,
    savedStateVector: encodeBinary(saved.savedStateVector),
  }
}
