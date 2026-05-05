import z from 'zod'

export const deleteSessionInput = z.object({
  token: z.string(),
})

export type DeleteSessionInput = z.infer<typeof deleteSessionInput>
