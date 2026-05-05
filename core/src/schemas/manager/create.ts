import z from 'zod'

export const createInput = z.object({
  contentType: z.string(),
  data: z.any(),
})

export type CreateInput = z.infer<typeof createInput>
