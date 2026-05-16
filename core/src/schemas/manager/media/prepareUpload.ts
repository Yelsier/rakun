import z from 'zod'

export const mediaAccessSchema = z.enum(['public', 'private'])
export const mediaUploadPurposeSchema = z.enum(['profileAvatar'])

export const prepareUploadInput = z.object({
  fileName: z.string().min(1),
  mime: z.string().min(1),
  size: z.number().int().positive(),
  access: mediaAccessSchema.optional(),
  key: z.string().min(1).optional(),
  folder: z.string().min(1).optional(),
  purpose: mediaUploadPurposeSchema.optional(),
})

export const prepareUploadOutput = z.object({
  url: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  key: z.string(),
  access: mediaAccessSchema,
})

export type PrepareUploadInput = z.infer<typeof prepareUploadInput>
export type PrepareUploadOutput = z.infer<typeof prepareUploadOutput>
