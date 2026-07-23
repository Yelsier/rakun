import z from 'zod'
import { linkedIteratorControl } from './linkedIterator'

export const updateInput = z.object({
  contentType: z.string(),
  id: z.string(),
  data: z.any(),
  linkedIterator: linkedIteratorControl.optional(),
})

export type UpdateInput = z.infer<typeof updateInput>
