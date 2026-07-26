import {
  ContentReviewPolicy,
  ManagerRole,
} from '../../../internal-content-types'
import { throwAppError } from '../../../lib/errors'
import { REVIEW_POLICY_CONFIGURE_PERMISSION } from '../../../lib/Permissions'
import { getContentTypeByName, getContentTypes } from '../../../lib/Registry'
import { getMongoService } from '../../../orm'
import type {
  DeleteReviewPolicyInput,
  DeleteReviewPolicyOutput,
  ListReviewPoliciesOutput,
  UpsertReviewPolicyInput,
} from '../../../schemas/manager/reviewPolicies'
import type { RakunRequestContext } from '../../context'
import { checkPermissions } from '../../utils/checkPermissions'
import {
  getRelationId,
  getReviewPolicyContentTypes,
  relation,
} from '../../utils/reviews'

const requireConfigure = (ctx: RakunRequestContext) => {
  const user = ctx.getUser()
  checkPermissions(user, [REVIEW_POLICY_CONFIGURE_PERMISSION])
  return user
}

const resolvePolicy = (
  policy: Record<string, unknown> & { _id: string },
): ListReviewPoliciesOutput['policies'][number] => ({
  _id: policy._id,
  roleId: getRelationId(policy.role) ?? '',
  contentTypes: getReviewPolicyContentTypes(policy),
  reviewerRoleIds: Array.isArray(policy.reviewerRoles)
    ? policy.reviewerRoles
        .map(getRelationId)
        .filter((id): id is string => Boolean(id))
    : [],
  requiredApprovals: Number(policy.requiredApprovals),
})

export const listReviewPoliciesHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext
}): Promise<ListReviewPoliciesOutput> => {
  requireConfigure(ctx)
  const db = await getMongoService()
  const [result, roles] = await Promise.all([
    db.list(ContentReviewPolicy, {
      options: { limit: 'all', sort: { updatedAt: 'desc' } as never },
    }),
    db.list(ManagerRole, {
      options: { limit: 'all', fields: ['name'], sort: { name: 'asc' } as never },
    }),
  ])
  return {
    policies: result.items.map((policy) => resolvePolicy(policy)),
    roles: roles.items.map((role) => ({ _id: role._id, name: role.name })),
    contentTypes: getContentTypes()
      .filter((contentType) => !contentType.isHiddenFromManager)
      .map((contentType) => ({ name: contentType.name }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  }
}

export const upsertReviewPolicyHandler = async ({
  input,
  ctx,
}: {
  input: UpsertReviewPolicyInput
  ctx: RakunRequestContext
}): Promise<ListReviewPoliciesOutput['policies'][number]> => {
  const user = requireConfigure(ctx)
  const db = await getMongoService()
  const contentTypes = Array.from(new Set(input.contentTypes))
  const missingContentType = contentTypes.find(
    (contentType) => !getContentTypeByName(contentType),
  )
  if (missingContentType) {
    throwAppError('NOT_FOUND', {
      resource: 'ContentType',
      id: missingContentType,
    })
  }

  const roleIds = Array.from(new Set([input.roleId, ...input.reviewerRoleIds]))
  const roles = await db.list(ManagerRole, {
    filter: { _id: { $in: roleIds } } as never,
    options: { limit: 'all', fields: ['_id'] },
  })
  if (roles.items.length !== roleIds.length) {
    throwAppError('VALIDATION', {
      errors: [{ path: ['reviewerRoleIds'], message: 'One or more roles do not exist' }],
    })
  }

  const policiesForRole = await db.list(ContentReviewPolicy, {
    filter: { 'role._id': input.roleId } as never,
    options: { limit: 'all' },
  })
  const conflictingPolicy = policiesForRole.items.find(
    (policy) =>
      policy._id !== input.id &&
      getReviewPolicyContentTypes(policy).some((contentType) =>
        contentTypes.includes(contentType),
      ),
  )
  if (conflictingPolicy) {
    throwAppError('VALIDATION', {
      errors: [
        {
          path: ['contentTypes'],
          message:
            'One or more content types already belong to another policy for this author role',
        },
      ],
    })
  }

  const data = {
    role: relation(ManagerRole.name, input.roleId),
    contentTypes,
    reviewerRoles: Array.from(new Set(input.reviewerRoleIds)).map((id) =>
      relation(ManagerRole.name, id),
    ),
    requiredApprovals: input.requiredApprovals,
    updatedBy: user._id,
  }
  const saved = input.id
    ? await db.update(ContentReviewPolicy, input.id, data, { actorId: user._id })
    : await db.create(
        ContentReviewPolicy,
        {
          _type: ContentReviewPolicy.name,
          ...data,
          createdBy: user._id,
        },
        { actorId: user._id },
      )

  return resolvePolicy(saved)
}

export const deleteReviewPolicyHandler = async ({
  input,
  ctx,
}: {
  input: DeleteReviewPolicyInput
  ctx: RakunRequestContext
}): Promise<DeleteReviewPolicyOutput> => {
  const user = requireConfigure(ctx)
  const db = await getMongoService()
  await db.delete(ContentReviewPolicy, { _id: input.id }, { actorId: user._id })
  return { deleted: true }
}
