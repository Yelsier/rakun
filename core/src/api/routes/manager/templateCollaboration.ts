import { getCollaborationService } from '../../../collaboration'
import { throwAppError } from '../../../lib/errors'
import { TEMPLATE_FIELD_NAME } from '../../../lib/systemFields'
import { getMongoService } from '../../../orm'
import { collaborationRealtimeTopic, getPlatform } from '../../../platform'
import type {
  SaveTemplateCollaborationOutput,
  SyncTemplateCollaborationInput,
  SyncTemplateCollaborationOutput,
  TemplateCollaborationReferenceInput,
} from '../../../schemas/manager/templateCollaboration'
import type { RakunRequestContext } from '../../context'
import {
  createTemplateContentSlot,
  getContentTemplate,
} from '../../utils/contentTemplate'
import { requireContentType } from '../../utils/requireContentType'
import { decodeBinary, encodeBinary } from './collaborationBinary'
import { requireTemplateUpdate, templateUpdateHandler } from './template'

export const getTemplateCollaborationRoomId = (contentType: string) =>
  `template:${encodeURIComponent(contentType)}`

const getAuthorizedTemplate = async ({
  input,
  ctx,
}: {
  input: TemplateCollaborationReferenceInput
  ctx: RakunRequestContext
}) => {
  const contentType = requireContentType(input.contentType)
  if (!contentType.hasTemplate) {
    throwAppError('FEATURE_UNSUPPORTED', { feature: 'template' })
  }

  requireTemplateUpdate(contentType, ctx)
  const template = await getContentTemplate(await getMongoService(), contentType)
  return {
    contentType,
    revision: template.revision,
    initialSnapshot: {
      [TEMPLATE_FIELD_NAME]: template.modules ?? [createTemplateContentSlot()],
    },
  }
}

export const syncTemplateCollaborationHandler = async ({
  input,
  ctx,
}: {
  input: SyncTemplateCollaborationInput
  ctx: RakunRequestContext
}): Promise<SyncTemplateCollaborationOutput> => {
  const { initialSnapshot } = await getAuthorizedTemplate({ input, ctx })
  const update = decodeBinary(input.update)
  const result = await getCollaborationService().sync({
    roomId: getTemplateCollaborationRoomId(input.contentType),
    initialSnapshot,
    stateVector: decodeBinary(input.stateVector),
    update,
  })

  if (update?.length) {
    getPlatform().realtime.publish(
      collaborationRealtimeTopic('template', input.contentType),
    )
  }

  return {
    update: encodeBinary(result.update),
    savedStateVector: encodeBinary(result.savedStateVector),
  }
}

export const saveTemplateCollaborationHandler = async ({
  input,
  ctx,
}: {
  input: TemplateCollaborationReferenceInput
  ctx: RakunRequestContext
}): Promise<SaveTemplateCollaborationOutput> => {
  const { initialSnapshot, revision } = await getAuthorizedTemplate({ input, ctx })
  const saved = await getCollaborationService().snapshot({
    roomId: getTemplateCollaborationRoomId(input.contentType),
    initialSnapshot,
    save: async (snapshot) => {
      const modules = snapshot[TEMPLATE_FIELD_NAME]
      return await templateUpdateHandler({
        input: {
          contentType: input.contentType,
          modules: Array.isArray(modules) ? modules : [],
          revision,
        },
        ctx,
      })
    },
  })

  return {
    template: saved.result,
    savedStateVector: encodeBinary(saved.savedStateVector),
  }
}
