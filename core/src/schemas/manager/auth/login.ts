import z from 'zod'

export const loginInput = z.object({
  username: z.string(),
  password: z.string(),
})

export const loginOutput = z
  .object({
    token: z.string(),
    expiresAt: z.string(),
  })
  .or(
    z.object({
      challenge: z.string(),
      expiresAt: z.string(),
      method: z.string(),
    }),
  )

export type LoginInput = z.infer<typeof loginInput>
export type LoginOutput = z.infer<typeof loginOutput>
