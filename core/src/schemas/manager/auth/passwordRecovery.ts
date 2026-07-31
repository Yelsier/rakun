import z from 'zod'

export const requestPasswordResetInput = z.object({
  email: z.string().email(),
})

export const requestPasswordResetOutput = z.object({
  ok: z.literal(true),
})

export const resetPasswordInput = z.object({
  token: z.string().min(32),
  password: z.string().min(8),
})

export const resetPasswordOutput = z.object({
  ok: z.literal(true),
})

export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetInput
>
export type ResetPasswordInput = z.infer<typeof resetPasswordInput>
