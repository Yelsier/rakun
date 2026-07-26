import {
  ContentReview,
  ContentReviewDecision,
  ManagerRole,
  ManagerUser,
} from '../../../internal-content-types'
import { throwAppError } from '../../../lib/errors'
import {
  hasPermissions,
  REVIEW_POLICY_CONFIGURE_PERMISSION,
  REVIEW_SELF_APPROVE_PERMISSION,
} from '../../../lib/Permissions'
import { getMongoService } from '../../../orm'
import type {
  CancelReviewInput,
  CancelReviewOutput,
  DecideReviewInput,
  DecideReviewOutput,
  GetReviewOutput,
  ListReviewCandidatesOutput,
  RequestReviewInput,
  RequestReviewOutput,
  ReviewReferenceInput,
} from '../../../schemas/manager/reviews'
import type { RakunRequestContext } from '../../context'
import { checkOwnership } from '../../utils/checkOwnership'
import { createManagerNotification } from '../../utils/managerNotifications'
import { requireContentType } from '../../utils/requireContentType'
import {
  canReadReviewDocument,
  canWriteReviewDocument,
  findLatestReview,
  getDocumentAuthorId,
  getDocumentRevisionToken,
  getReviewDecisionStatus,
  getDocumentReviewPolicy,
  getReviewPolicyForRole,
  getRelationId,
  listReviewCandidates,
  loadUserWithRole,
  relation,
  resolveReviewRecord,
  type StoredDecision,
  type StoredReview,
} from '../../utils/reviews'

const loadReviewContext = async (input: ReviewReferenceInput, ctx: RakunRequestContext) => {
  const contentType = requireContentType(input.contentType)
  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: 'readAny',
  })
  const db = await getMongoService()
  const document = (await db.get(contentType, input.documentId)) as Record<
    string,
    unknown
  > & { _id: string }
  const revisionToken = getDocumentRevisionToken(document)
  const policy = await getDocumentReviewPolicy({ contentType, document })
  return { contentType, document, revisionToken, policy }
}

const getSelfApprove = (ctx: RakunRequestContext) =>
  hasPermissions(ctx.getUser(), [REVIEW_SELF_APPROVE_PERMISSION])

export const getReviewHandler = async ({
  input,
  ctx,
}: {
  input: ReviewReferenceInput
  ctx: RakunRequestContext
}): Promise<GetReviewOutput> => {
  const state = await loadReviewContext(input, ctx)
  const review = await findLatestReview({
    contentType: input.contentType,
    documentId: input.documentId,
    revisionToken: state.revisionToken,
  })
  const currentUser = await loadUserWithRole(ctx.getUser()._id)
  const actorPolicy = currentUser
    ? await getReviewPolicyForRole({
        contentType: state.contentType.name,
        roleId: currentUser.role._id,
      })
    : null

  return {
    review: review
      ? await resolveReviewRecord({
          review,
          currentRevisionToken: state.revisionToken,
          contentType: state.contentType,
          document: state.document,
        })
      : null,
    policy: state.policy
      ? {
          roleId: state.policy.roleId,
          reviewerRoleIds: state.policy.reviewerRoleIds,
          requiredApprovals: state.policy.requiredApprovals,
        }
      : null,
    revisionToken: state.revisionToken,
    canRequest: Boolean(
      currentUser &&
        canWriteReviewDocument(state.contentType, state.document, currentUser),
    ),
    actorRequiresReview: Boolean(actorPolicy),
  }
}

export const listReviewCandidatesHandler = async ({
  input,
  ctx,
}: {
  input: ReviewReferenceInput
  ctx: RakunRequestContext
}): Promise<ListReviewCandidatesOutput> => {
  const state = await loadReviewContext(input, ctx)
  return (
    await listReviewCandidates({
      contentType: state.contentType,
      document: state.document,
      policy: state.policy,
      reviewAuthorId: getDocumentAuthorId(state.document),
      canSelfApprove: getSelfApprove(ctx),
    })
  ).map(({ source: _, ...candidate }) => candidate)
}

export const requestReviewHandler = async ({
  input,
  ctx,
}: {
  input: RequestReviewInput
  ctx: RakunRequestContext
}): Promise<RequestReviewOutput> => {
  const state = await loadReviewContext(input, ctx)
  const db = await getMongoService()
  const user = ctx.getUser()
  const currentUser = await loadUserWithRole(user._id)
  if (
    !currentUser ||
    !canWriteReviewDocument(state.contentType, state.document, currentUser)
  ) {
    throwAppError('FORBIDDEN', { reason: 'Write access is required to request review' })
  }

  const candidateList = await listReviewCandidates({
    contentType: state.contentType,
    document: state.document,
    policy: state.policy,
    reviewAuthorId: getDocumentAuthorId(state.document),
    canSelfApprove: getSelfApprove(ctx),
  })
  const candidates = new Map(candidateList.map((candidate) => [candidate.user._id, candidate]))
  const reviewerIds = Array.from(new Set(input.reviewerIds))
  if (reviewerIds.some((id) => !candidates.has(id))) {
    throwAppError('VALIDATION', {
      errors: [{ path: ['reviewerIds'], message: 'Every reviewer must be able to read the document' }],
    })
  }

  const requiredApprovals = state.policy?.requiredApprovals ?? 1
  if (
    state.policy &&
    reviewerIds.filter((id) => candidates.get(id)?.canApprove).length < requiredApprovals
  ) {
    throwAppError('VALIDATION', {
      errors: [
        {
          path: ['reviewerIds'],
          message: `Select at least ${requiredApprovals} reviewers eligible to approve`,
        },
      ],
    })
  }

  const existing = await db.find(ContentReview, {
    contentType: input.contentType,
    documentId: input.documentId,
    revisionToken: state.revisionToken,
  })
  if (existing) {
    throwAppError('CONFLICT', {
      key: 'REVIEW_ALREADY_EXISTS',
      message: 'A review already exists for this document revision',
    })
  }

  const author = state.policy?.author ??
    (await loadUserWithRole(
      String(state.document.updatedBy ?? state.document.createdBy ?? user._id),
    )) ??
    currentUser
  const review = (await db.create(
    ContentReview,
    {
      _type: ContentReview.name,
      contentType: input.contentType,
      documentId: input.documentId,
      revisionToken: state.revisionToken,
      requestedBy: relation(ManagerUser.name, user._id),
      author: relation(ManagerUser.name, author._id),
      subjectRole: relation(ManagerRole.name, author.role._id),
      reviewers: reviewerIds.map((id) => relation(ManagerUser.name, id)),
      reviewerRoles: (state.policy?.reviewerRoleIds ?? []).map((id) =>
        relation(ManagerRole.name, id),
      ),
      requiredApprovals,
      blocking: Boolean(state.policy),
      status: 'pending',
      createdBy: user._id,
      updatedBy: user._id,
    },
    { actorId: user._id },
  )) as StoredReview

  await Promise.all(
    reviewerIds.map((reviewerId) =>
      createManagerNotification({
        userId: reviewerId,
        authorId: user._id,
        eventId: review._id,
        kind: 'review_requested',
        reviewId: review._id,
        contentType: input.contentType,
        documentId: input.documentId,
        text: 'Review requested',
      }),
    ),
  )

  return {
    review: await resolveReviewRecord({
      review,
      currentRevisionToken: state.revisionToken,
      contentType: state.contentType,
      document: state.document,
    }),
  }
}

export const decideReviewHandler = async ({
  input,
  ctx,
}: {
  input: DecideReviewInput
  ctx: RakunRequestContext
}): Promise<DecideReviewOutput> => {
  const db = await getMongoService()
  const user = ctx.getUser()
  const review = (await db.get(ContentReview, input.reviewId)) as StoredReview
  const state = await loadReviewContext(
    { contentType: review.contentType, documentId: review.documentId },
    ctx,
  )
  if (review.revisionToken !== state.revisionToken) {
    throwAppError('CONFLICT', {
      key: 'REVIEW_OUTDATED',
      message: 'This review is for an older document revision',
    })
  }
  if (review.status !== 'pending') {
    throwAppError('CONFLICT', {
      key: 'REVIEW_CLOSED',
      message: 'This review is no longer accepting decisions',
    })
  }
  const reviewerIds = (review.reviewers ?? [])
    .map(getRelationId)
    .filter((id): id is string => Boolean(id))
  if (!reviewerIds.includes(user._id)) {
    throwAppError('FORBIDDEN', { reason: 'Only requested reviewers may decide' })
  }
  const currentUser = await loadUserWithRole(user._id)
  if (
    !currentUser ||
    !canReadReviewDocument(state.contentType, state.document, currentUser)
  ) {
    throwAppError('FORBIDDEN', { reason: 'Read access is required to review' })
  }
  if (await db.find(ContentReviewDecision, { reviewId: review._id, 'reviewer._id': user._id } as never)) {
    throwAppError('CONFLICT', {
      key: 'REVIEW_ALREADY_DECIDED',
      message: 'You already submitted a decision for this review',
    })
  }

  if (input.decision === 'approve') {
    const allowedRoles = new Set((review.reviewerRoles ?? []).map(getRelationId))
    const hasAllowedRole =
      allowedRoles.size === 0 || allowedRoles.has(currentUser.role._id)
    const isSelf = getRelationId(review.author) === user._id
    if (
      !canWriteReviewDocument(state.contentType, state.document, currentUser) ||
      !hasAllowedRole ||
      (isSelf && !getSelfApprove(ctx))
    ) {
      throwAppError('FORBIDDEN', {
        reason: 'This reviewer is not eligible to approve the document',
      })
    }
  }

  const decision = (await db.create(
    ContentReviewDecision,
    {
      _type: ContentReviewDecision.name,
      reviewId: review._id,
      reviewer: relation(ManagerUser.name, user._id),
      decision: input.decision,
      feedback: input.feedback,
      createdBy: user._id,
      updatedBy: user._id,
    },
    { actorId: user._id },
  )) as StoredDecision

  const decisions = await db.list(ContentReviewDecision, {
    filter: { reviewId: review._id },
    options: { limit: 'all' },
  })
  const nextStatus = getReviewDecisionStatus({
    decisions: decisions.items as StoredDecision[],
    requiredApprovals: review.requiredApprovals,
  })
  const updated = (await db.update(
    ContentReview,
    review._id,
    { status: nextStatus, updatedBy: user._id },
    { actorId: user._id },
  )) as StoredReview

  const recipientIds = Array.from(
    new Set(
      [getRelationId(review.author), getRelationId(review.requestedBy)].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  )
  await Promise.all(
    recipientIds.map((recipientId) =>
      createManagerNotification({
        userId: recipientId,
        authorId: user._id,
        eventId: decision._id,
        kind:
          input.decision === 'approve'
            ? 'review_approved'
            : 'review_changes_requested',
        reviewId: review._id,
        contentType: review.contentType,
        documentId: review.documentId,
        text:
          input.decision === 'approve'
            ? 'Review approved'
            : input.feedback
              ? `Changes requested: ${input.feedback}`
              : 'Changes requested',
      }),
    ),
  )

  return {
    review: await resolveReviewRecord({
      review: updated,
      currentRevisionToken: state.revisionToken,
      contentType: state.contentType,
      document: state.document,
    }),
  }
}

export const cancelReviewHandler = async ({
  input,
  ctx,
}: {
  input: CancelReviewInput
  ctx: RakunRequestContext
}): Promise<CancelReviewOutput> => {
  const db = await getMongoService()
  const user = ctx.getUser()
  const review = (await db.get(ContentReview, input.reviewId)) as StoredReview
  const isRequester = getRelationId(review.requestedBy) === user._id
  if (
    !isRequester &&
    !hasPermissions(user, [REVIEW_POLICY_CONFIGURE_PERMISSION])
  ) {
    throwAppError('FORBIDDEN', { reason: 'Only the requester may cancel this review' })
  }
  const state = await loadReviewContext(
    { contentType: review.contentType, documentId: review.documentId },
    ctx,
  )
  const updated = (await db.update(
    ContentReview,
    review._id,
    { status: 'cancelled', updatedBy: user._id },
    { actorId: user._id },
  )) as StoredReview

  return {
    review: await resolveReviewRecord({
      review: updated,
      currentRevisionToken: state.revisionToken,
      contentType: state.contentType,
      document: state.document,
    }),
  }
}
