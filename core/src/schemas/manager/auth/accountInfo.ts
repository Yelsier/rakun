import z from 'zod'

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

export type AccountInfoOutput = z.infer<typeof accountInfoOutput>
