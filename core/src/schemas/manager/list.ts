import z from 'zod'

export const listInput = z.object({
  contentType: z.string(),
  query: z.object({
    filter: z.record(z.string(), z.any()).optional(),
    options: z
      .object({
        fields: z.array(z.string()).optional(),
        limit: z.number().or(z.literal('all')).optional(),
        page: z.number().optional(),
        sort: z.record(z.string(), z.enum(['asc', 'desc'])).optional(),
      })
      .optional(),
  }),
})

export const listOutput = z.object({
  totalItems: z.number(),
  items: z.array(
    z
      .object({
        _id: z.string(),
      })
      .catchall(z.any()),
  ),
})

export type ListInput = z.infer<typeof listInput>
export type ListOutput = z.infer<typeof listOutput>
