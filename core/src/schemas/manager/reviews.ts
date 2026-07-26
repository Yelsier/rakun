import z from 'zod'

import { mentionUser } from './users'

export const reviewReferenceInput = z.object({
  contentType: z.string().min(1),
  documentId: z.string().min(1),
})

export const reviewStatus = z.enum([
  'pending',
  'changes_requested',
  'approved',
  'outdated',
  'cancelled',
])

export const reviewDecision = z.enum(['approve', 'request_changes'])

export const reviewCandidate = z.object({
  user: mentionUser,
  roleId: z.string(),
  canApprove: z.boolean(),
})

export const listReviewCandidatesOutput = z.array(reviewCandidate)

export const reviewDecisionRecord = z.object({
  _id: z.string(),
  reviewer: mentionUser,
  decision: reviewDecision,
  feedback: z.string().optional(),
  createdAt: z.date().optional(),
})

export const reviewRecord = z.object({
  _id: z.string(),
  contentType: z.string(),
  documentId: z.string(),
  revisionToken: z.string(),
  requestedBy: mentionUser,
  author: mentionUser,
  subjectRoleId: z.string(),
  reviewers: z.array(reviewCandidate),
  requiredApprovals: z.number().int().positive(),
  approvalCount: z.number().int().nonnegative(),
  blocking: z.boolean(),
  status: reviewStatus,
  decisions: z.array(reviewDecisionRecord),
  createdAt: z.date().optional(),
})

export const getReviewOutput = z.object({
  review: reviewRecord.nullable(),
  policy: z
    .object({
      roleId: z.string(),
      reviewerRoleIds: z.array(z.string()),
      requiredApprovals: z.number().int().positive(),
    })
    .nullable(),
  revisionToken: z.string(),
  canRequest: z.boolean(),
  actorRequiresReview: z.boolean(),
})

export const requestReviewInput = reviewReferenceInput.extend({
  reviewerIds: z.array(z.string().min(1)).min(1).max(50),
})

export const requestReviewOutput = z.object({
  review: reviewRecord,
})

export const decideReviewInput = z
  .object({
    reviewId: z.string().min(1),
    decision: reviewDecision,
    feedback: z.string().trim().max(5000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'request_changes' && !value.feedback) {
      ctx.addIssue({
        code: 'custom',
        path: ['feedback'],
        message: 'Feedback is required when requesting changes',
      })
    }
  })

export const decideReviewOutput = z.object({
  review: reviewRecord,
})

export const cancelReviewInput = z.object({
  reviewId: z.string().min(1),
})

export const cancelReviewOutput = z.object({
  review: reviewRecord,
})

export type ReviewReferenceInput = z.infer<typeof reviewReferenceInput>
export type ReviewStatus = z.infer<typeof reviewStatus>
export type ReviewDecision = z.infer<typeof reviewDecision>
export type ReviewCandidate = z.infer<typeof reviewCandidate>
export type ListReviewCandidatesOutput = z.infer<typeof listReviewCandidatesOutput>
export type ReviewDecisionRecord = z.infer<typeof reviewDecisionRecord>
export type ReviewRecord = z.infer<typeof reviewRecord>
export type GetReviewOutput = z.infer<typeof getReviewOutput>
export type RequestReviewInput = z.infer<typeof requestReviewInput>
export type RequestReviewOutput = z.infer<typeof requestReviewOutput>
export type DecideReviewInput = z.infer<typeof decideReviewInput>
export type DecideReviewOutput = z.infer<typeof decideReviewOutput>
export type CancelReviewInput = z.infer<typeof cancelReviewInput>
export type CancelReviewOutput = z.infer<typeof cancelReviewOutput>
