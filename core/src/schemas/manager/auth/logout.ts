import z from 'zod'

export const logoutOutput = z.object({
  token: z.string(),
})

export type LogoutOutput = z.infer<typeof logoutOutput>
