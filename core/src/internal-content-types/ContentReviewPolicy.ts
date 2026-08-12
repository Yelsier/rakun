import ContentType from '../lib/ContentType'
import { Fields } from '../lib/fields'
import type { DBOutput } from '../lib/types'
import { ManagerRole } from './ManagerRole'

export const ContentReviewPolicy = new ContentType({
  name: 'ContentReviewPolicy',
  permissions: false,
  fields: {
    role: Fields.relation(ManagerRole, 'existing').required(),
    contentType: Fields.string().optional(),
    contentTypes: Fields.array(Fields.string()).optional(),
    reviewerRoles: Fields.relation(ManagerRole, 'existing').multiple().required(),
    requiredApprovals: Fields.number().min(1).required(),
  },
}).hideFromManager()

export type ContentReviewPolicy = typeof ContentReviewPolicy
export type ContentReviewPolicyManager = DBOutput<ContentReviewPolicy>
