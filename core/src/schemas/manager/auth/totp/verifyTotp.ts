import z from 'zod'

export const verifyTotpInput = z.object({
  code: z
    .string()
    .regex(/^\d+$/, 'OTP must contain only digits')
    .length(6, 'OTP must be 6 digits'),
  challenge: z.string(),
})

export const verifyTotpOutput = z
  .object({
    token: z.string(),
    expiresAt: z.string(),
  })
  .or(
    z.object({
      error: z.string(),
    }),
  )

export type VerifyTotpInput = z.infer<typeof verifyTotpInput>
export type VerifyTotpOutput = z.infer<typeof verifyTotpOutput>
