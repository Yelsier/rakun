import z from 'zod'

export const slugPathChange = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  languageId: z.string().min(1),
  languageCode: z.string().optional(),
})

export const previewSlugRedirectsInput = z.object({
  contentType: z.string().min(1),
  documentId: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
  assumePublished: z.boolean().optional(),
  languageCodes: z.array(z.string().min(1)).optional(),
})

export const previewSlugRedirectsOutput = z.object({
  changes: z.array(slugPathChange),
})

export type SlugPathChange = z.infer<typeof slugPathChange>
export type PreviewSlugRedirectsInput = z.infer<typeof previewSlugRedirectsInput>
export type PreviewSlugRedirectsOutput = z.infer<
  typeof previewSlugRedirectsOutput
>
