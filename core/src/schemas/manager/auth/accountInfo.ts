import z from 'zod'

export const updateAccountInput = z.object({
  name: z.string().max(120).nullable().optional(),
  user: z.string().min(1).max(120),
  avatarId: z.string().min(1).nullable().optional(),
})

export const accountInfoOutput = z.object({
  has2FA: z.boolean(),
  enabled2FA: z.boolean(),
  method2FA: z.enum(['totp', 'webauthn']),
  sessions: z.array(
    z.object({
      token: z.string(),
      createdAt: z.date().optional(),
      expiresAt: z.date(),
    }),
  ),
  currentSession: z.string(),
})

export type UpdateAccountInput = z.infer<typeof updateAccountInput>
export type AccountInfoOutput = z.infer<typeof accountInfoOutput>
