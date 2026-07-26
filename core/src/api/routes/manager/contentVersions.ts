import { throwAppError } from '../../../lib/errors'
import { ContentReview } from '../../../internal-content-types'
import { getMongoService } from '../../../orm'
import type {
  CreateContentVersionInput,
  CreateContentVersionOutput,
  ListContentVersionsOutput,
  PromoteContentVersionInput,
  PromoteContentVersionOutput,
  ContentVersionReferenceInput,
} from '../../../schemas/manager/contentVersions'
import type { RakunRequestContext } from '../../context'
import { checkOwnership } from '../../utils/checkOwnership'
import {
  findLatestReview,
  getApprovedCurrentReview,
  getDocumentRevisionToken,
  getDocumentReviewPolicy,
} from '../../utils/reviews'
import { requireContentType } from '../../utils/requireContentType'
import { updateSingleRouteMap } from '../../utils/routes/updateRoutesMap'
import {
  LOCALE_VARIANT_GROUP_FIELD,
  LOCALE_VARIANT_ROLE_FIELD,
} from '../../../lib/localeVariants'
import { createHandler } from './create'
import {
  assignLocaleVariant,
  buildLocaleVariantList,
  cloneForLocaleVariant,
  getRouteForLocaleVariants,
  requireLanguagesByCode,
} from './localeVariants'

const toContentVersions = async ({
  input,
}: {
  input: ContentVersionReferenceInput
}): Promise<ListContentVersionsOutput> => {
  const variants = await buildLocaleVariantList(input)
  const db = await getMongoService()
  const contentType = requireContentType(input.contentType)
  const documents = await Promise.all(
    variants.documents.map(async (item) => {
      const document = (await db.get(contentType, item.documentId)) as Record<
        string,
        unknown
      >
      const revisionToken = getDocumentRevisionToken(document)
      const review = await findLatestReview({
        contentType: input.contentType,
        documentId: item.documentId,
        revisionToken,
      })
      const reviewRequired = Boolean(
        await getDocumentReviewPolicy({ contentType, document }),
      )
      const reviewStatus: 'pending' | 'changes_requested' | 'approved' | 'outdated' | 'cancelled' | undefined = review
        ? review.revisionToken === revisionToken || review.status === 'cancelled'
          ? review.status
          : 'outdated'
        : undefined

      const visibility:
        | 'draft'
        | 'hidden'
        | 'published'
        | 'trash'
        | undefined =
        document._visibility === 'draft' ||
        document._visibility === 'hidden' ||
        document._visibility === 'published' ||
        document._visibility === 'trash'
          ? document._visibility
          : undefined

      return {
        ...item,
        visibility,
        reviewStatus,
        reviewRequired,
      }
    }),
  )

  return {
    routeId: variants.routeId,
    routeKey: variants.routeKey,
    contentType: variants.contentType,
    groupId: variants.groupId,
    primaryDocumentId: variants.primaryDocumentId,
    currentDocumentId: variants.currentDocumentId,
    documents,
  }
}

export const listContentVersionsHandler = async ({
  input,
  ctx,
}: {
  input: ContentVersionReferenceInput
  ctx: RakunRequestContext
}): Promise<ListContentVersionsOutput> => {
  const contentType = requireContentType(input.contentType)
  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: 'readAny',
  })
  return await toContentVersions({ input })
}

export const createContentVersionHandler = async ({
  input,
  ctx,
}: {
  input: CreateContentVersionInput
  ctx: RakunRequestContext
}): Promise<CreateContentVersionOutput> => {
  const db = await getMongoService()
  const contentType = requireContentType(input.contentType)
  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: 'readAny',
  })
  await getRouteForLocaleVariants(input)
  const source = (await db.get(contentType, input.documentId)) as Record<
    string,
    unknown
  > & { _id: string }
  const cloned = cloneForLocaleVariant(contentType, source)
  const data: Record<string, unknown> = {
    ...cloned,
    ...(input.data ?? {}),
    _type: contentType.name,
    ...(contentType.documentVisibility ? { _visibility: 'draft' } : {}),
    [LOCALE_VARIANT_GROUP_FIELD]: cloned[LOCALE_VARIANT_GROUP_FIELD],
    [LOCALE_VARIANT_ROLE_FIELD]: cloned[LOCALE_VARIANT_ROLE_FIELD],
  }
  delete data._id
  delete data._revision
  delete data.createdAt
  delete data.createdBy
  delete data.updatedAt
  delete data.updatedBy

  const document = await createHandler({
    input: { contentType: input.contentType, data },
    ctx,
  })
  const documentId = String((document as { _id: string })._id)

  return {
    document: document as Record<string, unknown>,
    versions: await toContentVersions({
      input: { ...input, documentId },
    }),
  }
}

export const promoteContentVersionHandler = async ({
  input,
  ctx,
}: {
  input: PromoteContentVersionInput
  ctx: RakunRequestContext
}): Promise<PromoteContentVersionOutput> => {
  const db = await getMongoService()
  const contentType = requireContentType(input.contentType)
  const user = ctx.getUser()
  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: 'updateAny',
  })
  const document = (await db.get(contentType, input.documentId)) as Record<
    string,
    unknown
  > & { _id: string }
  const policy = await getDocumentReviewPolicy({ contentType, document })
  let approvedReview = policy
    ? await getApprovedCurrentReview({ contentType, document })
    : null
  if (
    policy &&
    !approvedReview &&
    document._visibility === 'published' &&
    typeof document._revision === 'number'
  ) {
    const latestReview = await findLatestReview({
      contentType: contentType.name,
      documentId: document._id,
    })
    const latestVersions = await db.versions.list({
      contentType: contentType.name,
      documentId: document._id,
    })
    const failedPromotionVersion = latestVersions.find(
      (version) => version.revision === document._revision,
    )

    if (
      latestReview?.status === 'approved' &&
      latestReview.revisionToken === `revision:${document._revision - 1}` &&
      failedPromotionVersion?.reason === 'content version promoted'
    ) {
      approvedReview = latestReview
    }
  }
  if (policy && !approvedReview) {
    throwAppError('FORBIDDEN', {
      reason: 'The current document revision requires an approved review',
    })
  }

  const isRouteable = Boolean(input.routeKey || input.languageCodes?.length)
  if (isRouteable) {
    await getRouteForLocaleVariants(input)
    if (!input.languageCodes?.length) {
      throwAppError('VALIDATION', {
        errors: [{ path: ['languageCodes'], message: 'Select at least one locale' }],
      })
    }
    await requireLanguagesByCode(input.languageCodes)
  }

  const updated =
    contentType.documentVisibility && document._visibility !== 'published'
      ? await db.update(
          contentType,
          input.documentId,
          { _visibility: 'published', updatedBy: user._id },
          {
            actorId: user._id,
            reason: 'content version promoted',
            skipVersioning: true,
          },
        )
      : document
  const updatedRevisionToken = getDocumentRevisionToken(
    updated as Record<string, unknown>,
  )
  if (
    approvedReview &&
    approvedReview.revisionToken !== updatedRevisionToken
  ) {
    await db.update(
      ContentReview,
      approvedReview._id,
      {
        revisionToken: updatedRevisionToken,
        updatedBy: user._id,
      },
      { actorId: user._id },
    )
  }

  let versions: ListContentVersionsOutput | undefined
  if (isRouteable && input.languageCodes) {
    await assignLocaleVariant({
      contentType: input.contentType,
      documentId: input.documentId,
      routeKey: input.routeKey,
      languageCodes: input.languageCodes,
    })
    await updateSingleRouteMap({
      contentType: input.contentType,
      contentTypeId: input.documentId,
    })
    versions = await toContentVersions({ input })
  }

  return {
    document: updated as Record<string, unknown>,
    versions,
  }
}
