import ContentType from '../lib/ContentType'
import { Fields } from '../lib/fields'
import type { DBOutput } from '../lib/types'
import { ManagerUser } from './ManagerUser'

export const ContentReviewDecision = new ContentType({
  name: 'ContentReviewDecision',
  permissions: false,
  fields: {
    reviewId: Fields.string().type('Id').required(),
    reviewer: Fields.relation(ManagerUser, 'existing').required(),
    decision: Fields.select(['approve', 'request_changes']).required(),
    feedback: Fields.string().type('Textarea'),
  },
  uniques: [['reviewId', 'reviewer']],
}).hideFromManager()

export type ContentReviewDecision = typeof ContentReviewDecision
export type ContentReviewDecisionManager = DBOutput<ContentReviewDecision>
