import {
  ContentReview,
  ContentReviewDecision,
  ContentReviewPolicy,
  ManagerRole,
  ManagerUser,
} from '../../internal-content-types'
import type ContentType from '../../lib/ContentType'
import {
  getContentPermission,
  hasPermissions,
} from '../../lib/Permissions'
import { getMongoService } from '../../orm'
import type {
  ReviewCandidate,
  ReviewRecord,
  ReviewStatus,
} from '../../schemas/manager/reviews'
import { fallbackMentionUser, toMentionUser } from '../routes/manager/users'

export type StoredRelation = {
  _id?: string
}

export type StoredReview = {
  _id: string
  contentType: string
  documentId: string
  revisionToken: string
  requestedBy?: StoredRelation
  author?: StoredRelation
  subjectRole?: StoredRelation
  reviewers?: StoredRelation[]
  reviewerRoles?: StoredRelation[]
  requiredApprovals: number
  blocking: boolean
  status: Exclude<ReviewStatus, 'outdated'>
  createdAt?: Date
}

export type StoredDecision = {
  _id: string
  reviewId: string
  reviewer?: StoredRelation
  decision: 'approve' | 'request_changes'
  feedback?: string
  createdAt?: Date
}

export type UserWithRole = {
  _id: string
  name?: string
  user: string
  avatarUrl?: string
  avatarPreviewUrl?: string
  role: {
    _id: string
    name: string
    permissions: string[]
  }
}

export const resolveStoredReviewStatus = (
  review: Pick<StoredReview, 'revisionToken' | 'status'>,
  currentRevisionToken: string,
): ReviewStatus =>
  review.revisionToken !== currentRevisionToken && review.status !== 'cancelled'
    ? 'outdated'
    : review.status

export const getReviewDecisionStatus = ({
  decisions,
  requiredApprovals,
}: {
  decisions: Array<Pick<StoredDecision, 'decision'>>
  requiredApprovals: number
}): 'pending' | 'changes_requested' | 'approved' => {
  if (decisions.some((decision) => decision.decision === 'request_changes')) {
    return 'changes_requested'
  }
  return decisions.filter((decision) => decision.decision === 'approve').length >=
    requiredApprovals
    ? 'approved'
    : 'pending'
}

export const getRelationId = (value: unknown) =>
  value && typeof value === 'object' && '_id' in value
    ? String((value as StoredRelation)._id)
    : undefined

export const getDocumentAuthorId = (document: Record<string, unknown>) => {
  const updatedBy =
    typeof document.updatedBy === 'string'
      ? document.updatedBy
      : getRelationId(document.updatedBy)
  const createdBy =
    typeof document.createdBy === 'string'
      ? document.createdBy
      : getRelationId(document.createdBy)
  return updatedBy || createdBy
}

export const relation = <T extends string>(contentType: T, id: string) => ({
  type: 'existing' as const,
  _id: id,
  contentType,
})

export const getReviewPolicyContentTypes = (
  policy: Record<string, unknown>,
) => {
  if (Array.isArray(policy.contentTypes)) {
    return Array.from(
      new Set(
        policy.contentTypes.filter(
          (contentType): contentType is string =>
            typeof contentType === 'string' && Boolean(contentType),
        ),
      ),
    )
  }
  return typeof policy.contentType === 'string' && policy.contentType
    ? [policy.contentType]
    : []
}

export const getDocumentRevisionToken = (document: Record<string, unknown>) => {
  if (typeof document._revision === 'number') {
    return `revision:${document._revision}`
  }

  const updatedAt = document.updatedAt
  if (updatedAt instanceof Date) return `updatedAt:${updatedAt.toISOString()}`
  if (typeof updatedAt === 'string') return `updatedAt:${updatedAt}`
  return `document:${String(document._id ?? '')}`
}

const loadRoles = async (
  ids: string[],
): Promise<Map<string, { _id: string; name: string; permissions: string[] }>> => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map<string, { _id: string; name: string; permissions: string[] }>()

  const db = await getMongoService()
  const result = await db.list(ManagerRole, {
    filter: { _id: { $in: uniqueIds } } as never,
    options: { limit: 'all', fields: ['name', 'permissions'] },
  })

  return new Map(
    result.items.map((role) => [
      role._id,
      {
        _id: role._id,
        name: role.name,
        permissions: Array.isArray(role.permissions)
          ? role.permissions.filter(
              (permission): permission is string => typeof permission === 'string',
            )
          : [],
      },
    ]),
  )
}

export const loadUsersWithRoles = async (ids?: string[]) => {
  const db = await getMongoService()
  const result = await db.list(ManagerUser, {
    filter: ids ? ({ _id: { $in: Array.from(new Set(ids)) } } as never) : {},
    options: {
      limit: 'all',
      fields: ['name', 'user', 'avatarUrl', 'avatarPreviewUrl', 'role'],
      sort: { user: 'asc' } as never,
    },
  })
  const roleIds = result.items
    .map((user) => getRelationId(user.role))
    .filter((id): id is string => Boolean(id))
  const roles = await loadRoles(roleIds)

  const users: UserWithRole[] = []
  for (const user of result.items) {
    const roleId = getRelationId(user.role)
    const role = roleId ? roles.get(roleId) : undefined
    if (!role) continue
    users.push({
        _id: user._id,
        name: user.name,
        user: user.user,
        avatarUrl: user.avatarUrl,
        avatarPreviewUrl: user.avatarPreviewUrl,
        role,
    })
  }
  return users
}

export const loadUserWithRole = async (id: string) =>
  (await loadUsersWithRoles([id]))[0]

const hasDocumentPermission = ({
  action,
  contentType,
  document,
  user,
}: {
  action: 'readAny' | 'updateAny'
  contentType: ContentType
  document: Record<string, unknown>
  user: UserWithRole
}) => {
  const actionPermission = getContentPermission(contentType, action)
  const ownPermission = getContentPermission(contentType, 'own')
  if (!actionPermission && !ownPermission) return true

  const owns = document.createdBy === user._id
  const permissions = owns
    ? [ownPermission, actionPermission].filter((permission): permission is string =>
        Boolean(permission),
      )
    : [actionPermission].filter((permission): permission is string => Boolean(permission))

  return permissions.some((permission) =>
    hasPermissions(user as never, [permission]),
  )
}

export const canReadReviewDocument = (
  contentType: ContentType,
  document: Record<string, unknown>,
  user: UserWithRole,
) => hasDocumentPermission({ action: 'readAny', contentType, document, user })

export const canWriteReviewDocument = (
  contentType: ContentType,
  document: Record<string, unknown>,
  user: UserWithRole,
) => hasDocumentPermission({ action: 'updateAny', contentType, document, user })

export const getDocumentReviewPolicy = async ({
  contentType,
  document,
}: {
  contentType: ContentType
  document: Record<string, unknown>
}) => {
  const authorId = getDocumentAuthorId(document)
  if (!authorId) return null

  const author = await loadUserWithRole(authorId)
  if (!author) return null

  const db = await getMongoService()
  const policy = await db.find(ContentReviewPolicy, {
    'role._id': author.role._id,
    $or: [
      { contentTypes: contentType.name },
      { contentType: contentType.name },
    ],
  } as never)

  if (!policy) return null

  return {
    policy,
    author,
    roleId: author.role._id,
    reviewerRoleIds: Array.isArray(policy.reviewerRoles)
      ? policy.reviewerRoles
          .map(getRelationId)
          .filter((id): id is string => Boolean(id))
      : [],
    requiredApprovals: Number(policy.requiredApprovals),
  }
}

export const getReviewPolicyForRole = async ({
  contentType,
  roleId,
}: {
  contentType: string
  roleId: string
}) => {
  const db = await getMongoService()
  return await db.find(ContentReviewPolicy, {
    'role._id': roleId,
    $or: [{ contentTypes: contentType }, { contentType }],
  } as never)
}

export const listReviewCandidates = async ({
  contentType,
  document,
  policy,
  reviewAuthorId,
  canSelfApprove,
}: {
  contentType: ContentType
  document: Record<string, unknown>
  policy: Awaited<ReturnType<typeof getDocumentReviewPolicy>>
  reviewAuthorId?: string
  canSelfApprove: boolean
}): Promise<Array<ReviewCandidate & { source: UserWithRole }>> => {
  const users = await loadUsersWithRoles()
  const reviewerRoles = new Set(policy?.reviewerRoleIds ?? [])

  return users
    .filter((user) => canReadReviewDocument(contentType, document, user))
    .map((user) => ({
      user: toMentionUser(user),
      roleId: user.role._id,
      canApprove:
        canWriteReviewDocument(contentType, document, user) &&
        (!policy || reviewerRoles.has(user.role._id)) &&
        (user._id !== reviewAuthorId || canSelfApprove),
      source: user,
    }))
}

export const findLatestReview = async ({
  contentType,
  documentId,
  revisionToken,
}: {
  contentType: string
  documentId: string
  revisionToken?: string
}) => {
  const db = await getMongoService()
  if (revisionToken) {
    const current = await db.find(ContentReview, {
      contentType,
      documentId,
      revisionToken,
    })
    if (current) return current as StoredReview
  }

  const result = await db.list(ContentReview, {
    filter: { contentType, documentId },
    options: { limit: 1, sort: { createdAt: 'desc' } as never },
  })
  return (result.items[0] as StoredReview | undefined) ?? null
}

export const resolveReviewRecord = async ({
  review,
  currentRevisionToken,
  contentType,
  document,
}: {
  review: StoredReview
  currentRevisionToken: string
  contentType: ContentType
  document: Record<string, unknown>
}): Promise<ReviewRecord> => {
  const db = await getMongoService()
  const decisionsResult = await db.list(ContentReviewDecision, {
    filter: { reviewId: review._id },
    options: { limit: 'all', sort: { createdAt: 'asc' } as never },
  })
  const decisions = decisionsResult.items as StoredDecision[]
  const userIds = Array.from(
    new Set(
      [
        getRelationId(review.requestedBy),
        getRelationId(review.author),
        ...(review.reviewers ?? []).map(getRelationId),
        ...decisions.map((decision) => getRelationId(decision.reviewer)),
      ].filter((id): id is string => Boolean(id)),
    ),
  )
  const users = await loadUsersWithRoles(userIds)
  const usersById = new Map(users.map((user) => [user._id, user]))
  const reviewerRoleIds = new Set((review.reviewerRoles ?? []).map(getRelationId))
  const approvalCount = decisions.filter(
    (decision) => decision.decision === 'approve',
  ).length
  const status = resolveStoredReviewStatus(review, currentRevisionToken)
  const toUser = (id?: string) => {
    const user = id ? usersById.get(id) : undefined
    return user ? toMentionUser(user) : fallbackMentionUser(id ?? '')
  }

  return {
    _id: review._id,
    contentType: review.contentType,
    documentId: review.documentId,
    revisionToken: review.revisionToken,
    requestedBy: toUser(getRelationId(review.requestedBy)),
    author: toUser(getRelationId(review.author)),
    subjectRoleId: getRelationId(review.subjectRole) ?? '',
    reviewers: (review.reviewers ?? []).map((reviewer) => {
      const id = getRelationId(reviewer)
      const user = id ? usersById.get(id) : undefined
      return {
        user: toUser(id),
        roleId: user?.role._id ?? '',
        canApprove: Boolean(
          user &&
            canWriteReviewDocument(contentType, document, user) &&
            (reviewerRoleIds.size === 0 || reviewerRoleIds.has(user.role._id)),
        ),
      }
    }),
    requiredApprovals: review.requiredApprovals,
    approvalCount,
    blocking: review.blocking,
    status,
    decisions: decisions.map((decision) => ({
      _id: decision._id,
      reviewer: toUser(getRelationId(decision.reviewer)),
      decision: decision.decision,
      feedback: decision.feedback,
      createdAt: decision.createdAt,
    })),
    createdAt: review.createdAt,
  }
}

export const getApprovedCurrentReview = async ({
  contentType,
  document,
}: {
  contentType: ContentType
  document: Record<string, unknown> & { _id: string }
}) => {
  const revisionToken = getDocumentRevisionToken(document)
  const review = await findLatestReview({
    contentType: contentType.name,
    documentId: document._id,
    revisionToken,
  })
  if (!review || review.revisionToken !== revisionToken) return null
  if (review.status !== 'approved') return null
  return review
}
