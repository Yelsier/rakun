import { randomBytes, randomUUID } from 'crypto'
import { z } from 'zod'

import { getRakunBootstrapOptions } from '../../../../bootstrapState'
import { Language, PreviewSnapshot } from '../../../../internal-content-types'
import { throwAppError } from '../../../../lib/errors'
import { Logger } from '../../../../lib/Logger'
import { getContentTypeByName } from '../../../../lib/Registry'
import { Permission } from '../../../../lib/Permissions'
import { getMongoService } from '../../../../orm'
import { CreatePreviewInput } from '../../../../schemas/manager/preview'
import { RakunRequestContext } from '../../../context'
import { checkPermissions } from '../../../utils/checkPermissions'
import { checkOwnership } from '../../../utils/checkOwnership'
import { getLanguages } from '../../../utils/getLanguages'
import { serializePreviewData } from '../../../utils/previewData'
import { hashPreviewToken } from '../../../utils/previewToken'
import { buildRoutePath, getParentPath, loadRouteData } from '../../../utils/routes/routeMapHelpers'
import { routeSignature } from '../../../utils/routes/routeDefinitions'
import { requireContentType } from '../../../utils/requireContentType'

const PREVIEW_TTL_MS = 10 * 60 * 1000

const createPreviewToken = () => randomBytes(32).toString('base64url')

const getPreviewLanguage = async (languageCode?: string) => {
  const languages = await getLanguages()
  const language =
    (languageCode ? languages.find((item) => item.code === languageCode) : undefined) ??
    languages.find((item) => item.default) ??
    languages[0]

  if (!language) {
    throwAppError('NOT_FOUND', {
      resource: Language.name,
    })
  }

  return { language, languages }
}

const getPreviewRoute = async ({
  contentType,
  routeKey,
}: {
  contentType: string
  routeKey?: string
}) => {
  const routeDefinitions = getRakunBootstrapOptions()?.routes ?? []
  const { routes, routeSettings } = await loadRouteData()
  const definition = routeKey
    ? routeDefinitions.find((item) => item.key === routeKey)
    : routeDefinitions.find((item) => item.contentType === contentType && item.hasPage)

  if (!definition || definition.contentType !== contentType || !definition.hasPage) {
    throwAppError('FEATURE_UNSUPPORTED', {
      feature: 'preview',
      message: `No page route is configured for ${contentType}`,
    })
  }

  const route = routes.find((item) => routeSignature(item) === routeSignature(definition))

  if (!route || !route.hasPage) {
    throwAppError('FEATURE_UNSUPPORTED', {
      feature: 'preview',
      message: `No page route is configured for ${contentType}`,
    })
  }

  return { route, routes, routeSettings }
}

export const createPreviewHandler = async ({
  input,
  ctx,
}: {
  input: CreatePreviewInput
  ctx: RakunRequestContext
}) => {
  const user = ctx.getUser()
  const contentType = requireContentType(input.contentType)

  if (input.documentId) {
    await checkOwnership({
      ctx,
      contentType,
      id: input.documentId,
      permission: 'updateAny',
    })
  } else {
    checkPermissions(user, [`content.${contentType.name}.own` as Permission])
  }

  const db = await getMongoService()
  const { route, routes, routeSettings } = await getPreviewRoute({
    contentType: contentType.name,
    routeKey: input.routeKey,
  })
  const { language, languages } = await getPreviewLanguage(input.languageCode)
  const itemId = input.documentId ?? randomUUID()

  let parsedData: Record<string, unknown>
  try {
    parsedData = contentType.validate({
      ...input.data,
      _id: itemId,
      _type: contentType.name,
      updatedBy: user._id,
      ...(input.documentId ? {} : { createdBy: user._id }),
    }) as Record<string, unknown>
  } catch (error) {
    if (error instanceof z.ZodError) {
      throwAppError('VALIDATION', {
        errors: error.issues,
      })
    }

    throw error
  }

  const previewItem = {
    ...parsedData,
    _id: itemId,
    _type: contentType.name,
  } as Record<string, unknown> & { _id: string; _type: string }
  const parentPath = await getParentPath(previewItem, route, language, routes, languages)
  const path = buildRoutePath(previewItem, route, language, parentPath, languages, routeSettings)
  const token = createPreviewToken()
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS)

  await db.create(PreviewSnapshot, {
    _type: PreviewSnapshot.name,
    tokenHash: hashPreviewToken(token),
    contentType: contentType.name,
    documentId: input.documentId,
    routeId: route._id,
    languageCode: language.code,
    path,
    data: serializePreviewData(previewItem),
    createdBy: user._id,
    expiresAt,
  })

  Logger.addTrace('manager.preview.create: snapshot created', {
    contentType: contentType.name,
    routeId: route._id,
    path,
  })

  return {
    token,
    path,
    expiresAt: expiresAt.toISOString(),
  }
}
