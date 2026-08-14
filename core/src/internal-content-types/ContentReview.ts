import ContentType from '../lib/ContentType'
import { Fields } from '../lib/fields'
import type { DBOutput } from '../lib/types'
import { ManagerRole } from './ManagerRole'
import { ManagerUser } from './ManagerUser'

const contentReviewStatuses = [
  'pending',
  'changes_requested',
  'approved',
  'cancelled',
] as const

const contentTypeField = Fields.string().required()
const documentIdField = Fields.string().type('Id').required()
const revisionTokenField = Fields.string().required()
const requestedByField = Fields.relation(ManagerUser, 'existing').required()
const authorField = Fields.relation(ManagerUser, 'existing').required()
const subjectRoleField = Fields.relation(ManagerRole, 'existing').required()
const reviewersField = Fields.relation(ManagerUser, 'existing').multiple().required()
const reviewerRolesField = Fields.relation(ManagerRole, 'existing').optional().multiple()
const requiredApprovalsField = Fields.number().min(1).required()
const blockingField = Fields.boolean().required()
const statusField = Fields.select(contentReviewStatuses).required()

const contentReviewFields: {
  contentType: typeof contentTypeField
  documentId: typeof documentIdField
  revisionToken: typeof revisionTokenField
  requestedBy: typeof requestedByField
  author: typeof authorField
  subjectRole: typeof subjectRoleField
  reviewers: typeof reviewersField
  reviewerRoles: typeof reviewerRolesField
  requiredApprovals: typeof requiredApprovalsField
  blocking: typeof blockingField
  status: typeof statusField
} = {
  contentType: contentTypeField,
  documentId: documentIdField,
  revisionToken: revisionTokenField,
  requestedBy: requestedByField,
  author: authorField,
  subjectRole: subjectRoleField,
  reviewers: reviewersField,
  reviewerRoles: reviewerRolesField,
  requiredApprovals: requiredApprovalsField,
  blocking: blockingField,
  status: statusField,
}

export const ContentReview: ContentType<typeof contentReviewFields, 'ContentReview'> = new ContentType({
  name: 'ContentReview',
  permissions: false,
  fields: contentReviewFields,
  uniques: [['contentType', 'documentId', 'revisionToken']],
}).hideFromManager()

export type ContentReview = typeof ContentReview
export type ContentReviewManager = DBOutput<ContentReview>
