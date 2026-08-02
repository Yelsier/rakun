import z from 'zod'

export const updateInput = z.object({
  contentType: z.string(),
  id: z.string(),
  data: z.any(),
  createPermanentRedirects: z.boolean().optional(),
})

export type UpdateInput = z.infer<typeof updateInput>
