import z from 'zod'

export const reviewPolicyRecord = z.object({
  _id: z.string(),
  roleId: z.string(),
  contentTypes: z.array(z.string()).min(1),
  reviewerRoleIds: z.array(z.string()),
  requiredApprovals: z.number().int().positive(),
})

export const listReviewPoliciesOutput = z.object({
  policies: z.array(reviewPolicyRecord),
  roles: z.array(z.object({ _id: z.string(), name: z.string() })),
  contentTypes: z.array(z.object({ name: z.string() })),
})

export const upsertReviewPolicyInput = z.object({
  id: z.string().optional(),
  roleId: z.string().min(1),
  contentTypes: z.array(z.string().min(1)).min(1),
  reviewerRoleIds: z.array(z.string().min(1)).min(1),
  requiredApprovals: z.number().int().positive(),
})

export const deleteReviewPolicyInput = z.object({
  id: z.string().min(1),
})

export const deleteReviewPolicyOutput = z.object({
  deleted: z.boolean(),
})

export type ReviewPolicyRecord = z.infer<typeof reviewPolicyRecord>
export type ListReviewPoliciesOutput = z.infer<typeof listReviewPoliciesOutput>
export type UpsertReviewPolicyInput = z.infer<typeof upsertReviewPolicyInput>
export type DeleteReviewPolicyInput = z.infer<typeof deleteReviewPolicyInput>
export type DeleteReviewPolicyOutput = z.infer<typeof deleteReviewPolicyOutput>
