import z from 'zod'

import { literalValidationOutput } from './list'

export const upsertLiteralInput = z.object({
  key: z.string().min(1),
  locale: z.string().min(2),
  message: z.string().min(1),
})

export const upsertLiteralOutput = z.object({
  ok: z.boolean(),
  key: z.string(),
  locale: z.string(),
  message: z.string(),
  validation: literalValidationOutput,
})

export type UpsertLiteralInput = z.infer<typeof upsertLiteralInput>
export type UpsertLiteralOutput = z.infer<typeof upsertLiteralOutput>
