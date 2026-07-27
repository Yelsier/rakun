import z from 'zod'

import { Language } from '../../internal-content-types'
import { reviewStatus } from './reviews'
import { localeVariantName } from './localeVariants'

export const contentVersionReferenceInput = z.object({
  contentType: z.string().min(1),
  documentId: z.string().min(1),
  routeKey: z.string().optional(),
})

export const contentVersionDocument = z.object({
  documentId: z.string(),
  role: z.enum(['primary', 'variant']),
  name: z.string().optional(),
  label: z.string(),
  visibility: z.enum(['draft', 'hidden', 'published', 'trash']).optional(),
  assignedLanguages: z.array(Language.getOutputSchema()),
  reviewStatus: reviewStatus.optional(),
  reviewRequired: z.boolean(),
})

export const listContentVersionsOutput = z.object({
  routeId: z.string(),
  routeKey: z.string(),
  contentType: z.string(),
  groupId: z.string(),
  primaryDocumentId: z.string(),
  currentDocumentId: z.string(),
  documents: z.array(contentVersionDocument),
})

export const createContentVersionInput = contentVersionReferenceInput.extend({
  name: localeVariantName,
  data: z.record(z.string(), z.unknown()).optional(),
})

export const createContentVersionOutput = z.object({
  document: z.record(z.string(), z.unknown()),
  versions: listContentVersionsOutput,
})

export const promoteContentVersionInput = contentVersionReferenceInput.extend({
  languageCodes: z.array(z.string()).optional(),
})

export const promoteContentVersionOutput = z.object({
  document: z.record(z.string(), z.unknown()),
  versions: listContentVersionsOutput.optional(),
})

export type ContentVersionReferenceInput = z.infer<typeof contentVersionReferenceInput>
export type ContentVersionDocument = z.infer<typeof contentVersionDocument>
export type ListContentVersionsOutput = z.infer<typeof listContentVersionsOutput>
export type CreateContentVersionInput = z.infer<typeof createContentVersionInput>
export type CreateContentVersionOutput = z.infer<typeof createContentVersionOutput>
export type PromoteContentVersionInput = z.infer<typeof promoteContentVersionInput>
export type PromoteContentVersionOutput = z.infer<typeof promoteContentVersionOutput>
