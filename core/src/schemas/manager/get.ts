import z from 'zod'

export const getInput = z.object({
  contentType: z.string(),
  id: z.string(),
})

export type GetInput = z.infer<typeof getInput>
