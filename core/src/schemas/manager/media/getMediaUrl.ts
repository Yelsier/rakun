import z from 'zod'

import { mediaAccessSchema } from './prepareUpload'
import { mediaUrl } from './mediaUrl'

export const getMediaUrlInput = z.object({
  key: z.string().min(1),
  access: mediaAccessSchema.optional(),
  expiresInSeconds: z.number().int().positive().max(60 * 60).optional(),
})

export const getMediaUrlOutput = z.object({
  key: z.string(),
  access: mediaAccessSchema,
  url: mediaUrl,
  expiresAt: z.date().nullable(),
  isPublic: z.boolean(),
})

export type GetMediaUrlInput = z.infer<typeof getMediaUrlInput>
export type GetMediaUrlOutput = z.infer<typeof getMediaUrlOutput>
