import z from 'zod'

export const deleteInput = z.object({
  contentType: z.string(),
  id: z.string(),
})

export type DeleteInput = z.infer<typeof deleteInput>
