import z from 'zod'

export const generatePosterInput = z.object({
  id: z.string().min(1),
  second: z.number().finite().min(0).max(86_400),
})

export const generatePosterOutput = z.object({
  posterMediaId: z.string(),
  posterUrl: z.url().optional(),
})

export type GeneratePosterInput = z.infer<typeof generatePosterInput>
export type GeneratePosterOutput = z.infer<typeof generatePosterOutput>
