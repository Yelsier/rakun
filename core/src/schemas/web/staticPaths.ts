import z from 'zod'

export const staticPathOutput = z.object({
  path: z.string(),
  ttl: z.number().int().positive(),
})

export const staticPathsOutput = z.object({
  items: z.array(staticPathOutput),
})

export type StaticPathOutput = z.output<typeof staticPathOutput>
export type StaticPathsOutput = z.output<typeof staticPathsOutput>
