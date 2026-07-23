import z from 'zod'
import { linkedIteratorControl } from './linkedIterator'

export const createInput = z.object({
  contentType: z.string(),
  data: z.any(),
  linkedIterator: linkedIteratorControl.optional(),
})

export type CreateInput = z.infer<typeof createInput>
