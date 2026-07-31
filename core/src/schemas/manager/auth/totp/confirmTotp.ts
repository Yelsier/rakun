import z from 'zod'

export const confirmTotpInput = z.object({
  code: z
    .string()
    .regex(/^\d+$/, 'OTP must contain only digits')
    .length(6, 'OTP must be 6 digits'),
})

export const confirmTotpOutput = z.object({
  ok: z.literal(true),
  recoveryCodes: z.array(z.string()),
})

export type ConfirmTotpInput = z.infer<typeof confirmTotpInput>
export type ConfirmTotpOutput = z.infer<typeof confirmTotpOutput>
