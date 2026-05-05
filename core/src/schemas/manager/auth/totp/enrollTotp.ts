import z from 'zod'

export const enrollTotpOutput = z.object({
  qrDataURL: z.string(),
  otpauthURL: z.string(),
})

export type EnrollTotpOutput = z.infer<typeof enrollTotpOutput>
