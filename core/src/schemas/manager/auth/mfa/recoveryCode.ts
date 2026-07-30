import z from 'zod'

export const verifyRecoveryCodeInput = z.object({
  challenge: z.string().min(1),
  code: z.string().min(8),
})

export const verifyRecoveryCodeOutput = z
  .object({
    token: z.string(),
    expiresAt: z.string(),
  })
  .or(
    z.object({
      error: z.literal('INVALID_CODE'),
    }),
  )

export const mfaEnrollmentOutput = z.object({
  ok: z.literal(true),
  recoveryCodes: z.array(z.string()),
})

export const regenerateRecoveryCodesInput = z.object({
  currentPassword: z.string().min(1),
})

export type RegenerateRecoveryCodesInput = z.infer<
  typeof regenerateRecoveryCodesInput
>

export type VerifyRecoveryCodeInput = z.infer<
  typeof verifyRecoveryCodeInput
>
export type VerifyRecoveryCodeOutput = z.infer<
  typeof verifyRecoveryCodeOutput
>
