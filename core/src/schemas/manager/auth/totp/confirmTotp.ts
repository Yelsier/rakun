import z from 'zod'

export const confirmTotpInput = z.object({
  code: z
    .string()
    .regex(/^\d+$/, 'OTP must contain only digits')
    .length(6, 'OTP must be 6 digits'),
})

export const confirmTotpOutput = z
  .object({
    token: z.string(),
  })
  .or(
    z.object({
      error: z.string(),
    }),
  )

export type ConfirmTotpInput = z.infer<typeof confirmTotpInput>
export type ConfirmTotpOutput = z.infer<typeof confirmTotpOutput>
