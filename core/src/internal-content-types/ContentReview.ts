import ContentType from '../lib/ContentType'
import { Fields } from '../lib/fields'
import type { DBOutput } from '../lib/types'
import { ManagerRole } from './ManagerRole'
import { ManagerUser } from './ManagerUser'

export const ContentReview = new ContentType({
  name: 'ContentReview',
  permissions: false,
  fields: {
    contentType: Fields.string().required(),
    documentId: Fields.string().type('Id').required(),
    revisionToken: Fields.string().required(),
    requestedBy: Fields.relation(ManagerUser, 'existing').required(),
    author: Fields.relation(ManagerUser, 'existing').required(),
    subjectRole: Fields.relation(ManagerRole, 'existing').required(),
    reviewers: Fields.relation(ManagerUser, 'existing').multiple().required(),
    reviewerRoles: Fields.relation(ManagerRole, 'existing').multiple(),
    requiredApprovals: Fields.number().min(1).required(),
    blocking: Fields.boolean().required(),
    status: Fields.select([
      'pending',
      'changes_requested',
      'approved',
      'cancelled',
    ]).required(),
  },
  uniques: [['contentType', 'documentId', 'revisionToken']],
}).hideFromManager()

export type ContentReview = typeof ContentReview
export type ContentReviewManager = DBOutput<ContentReview>
