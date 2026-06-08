import z from 'zod'

import { mediaAccessSchema, mediaUploadPurposeSchema } from './prepareUpload'

export const mediaStatusSchema = z.enum(['uploaded', 'archived', 'deleted'])
export const mediaOrientationSchema = z.enum(['portrait', 'landscape'])

export const mediaFolderRefOutput = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  path: z.string(),
})

export const mediaSizeOutput = z.object({
  key: z.string(),
  url: z.url().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mime: z.string(),
  size: z.number().int().nonnegative(),
})

export const mediaSizeInput = mediaSizeOutput.omit({ url: true })

export const mediaRecordOutput = z.object({
  _id: z.string(),
  _type: z.literal('Media'),
  name: z.string(),
  title: z.string().optional(),
  alt: z.string().optional(),
  originalName: z.string(),
  key: z.string(),
  access: mediaAccessSchema,
  mime: z.string(),
  extension: z.string().optional(),
  size: z.number().int().nonnegative(),
  etag: z.string().optional(),
  url: z.url().optional(),
  previewKey: z.string().optional(),
  previewUrl: z.url().optional(),
  previewMime: z.string().optional(),
  sizes: z.array(mediaSizeOutput).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  orientation: mediaOrientationSchema.optional(),
  optimized: z.boolean().optional(),
  optimizedFormat: z.string().optional(),
  optimizationQuality: z.number().int().min(1).max(100).optional(),
  originalSize: z.number().int().nonnegative().optional(),
  uploadedAt: z.date(),
  status: mediaStatusSchema,
  folder: z
    .object({
      type: z.literal('existing'),
      _id: z.string(),
      contentType: z.literal('MediaFolder'),
    })
    .optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export const finalizeUploadInput = z.object({
  key: z.string().min(1),
  access: mediaAccessSchema.optional(),
  uploadToken: z.string().min(1),
  fileName: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  mime: z.string().min(1).optional(),
  size: z.number().int().nonnegative().optional(),
  previewKey: z.string().min(1).optional(),
  previewMime: z.string().min(1).optional(),
  sizes: z.array(mediaSizeInput).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  orientation: mediaOrientationSchema.optional(),
  optimized: z.boolean().optional(),
  optimizedFormat: z.string().min(1).optional(),
  optimizationQuality: z.number().int().min(1).max(100).optional(),
  originalSize: z.number().int().nonnegative().optional(),
  folderId: z.string().min(1).optional(),
  folderPath: z.string().min(1).optional(),
  status: mediaStatusSchema.optional(),
  purpose: mediaUploadPurposeSchema.optional(),
})

export const finalizeUploadOutput = z.object({
  key: z.string(),
  access: mediaAccessSchema,
  size: z.number().int().nonnegative(),
  mime: z.string().optional(),
  etag: z.string().optional(),
  publicUrl: z.url().nullable(),
  media: mediaRecordOutput,
  folder: mediaFolderRefOutput.optional(),
})

export type FinalizeUploadInput = z.infer<typeof finalizeUploadInput>
export type FinalizeUploadOutput = z.infer<typeof finalizeUploadOutput>
