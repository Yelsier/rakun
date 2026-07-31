import z from 'zod'

export const passwordIpBlockRecord = z.object({
  id: z.string(),
  ip: z.string(),
  failedAttempts: z.number().int().nonnegative(),
  lastFailedAt: z.string(),
  blockedAt: z.string(),
})

export const listPasswordIpBlocksOutput = z.object({
  maxAttempts: z.number().int().nonnegative(),
  items: z.array(passwordIpBlockRecord),
})

export const unblockPasswordIpInput = z.object({
  id: z.string().min(1),
})

export const unblockPasswordIpOutput = z.object({
  unblocked: z.boolean(),
})

export type PasswordIpBlockRecord = z.infer<typeof passwordIpBlockRecord>
export type ListPasswordIpBlocksOutput = z.infer<
  typeof listPasswordIpBlocksOutput
>
export type UnblockPasswordIpInput = z.infer<typeof unblockPasswordIpInput>
export type UnblockPasswordIpOutput = z.infer<typeof unblockPasswordIpOutput>
