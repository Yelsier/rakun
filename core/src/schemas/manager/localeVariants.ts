import z from "zod";

import { Language } from "../../internal-content-types";

export const localeVariantName = z.string().trim().min(1).max(120);

export const localeVariantListInput = z.object({
  contentType: z.string(),
  documentId: z.string(),
  routeKey: z.string().optional(),
});

export const localeVariantCreateInput = z.object({
  contentType: z.string(),
  documentId: z.string(),
  name: localeVariantName,
  routeKey: z.string().optional(),
  languageCodes: z.array(z.string()).optional(),
});

export const localeVariantAssignInput = z.object({
  contentType: z.string(),
  documentId: z.string(),
  routeKey: z.string().optional(),
  languageCodes: z.array(z.string()).min(1),
});

export const localeVariantUnassignInput = z.object({
  contentType: z.string(),
  documentId: z.string(),
  routeKey: z.string().optional(),
  languageCodes: z.array(z.string()).min(1),
});

export const localeVariantSetPrimaryInput = localeVariantListInput;

export const localeVariantTrashInput = localeVariantListInput;

export const localeVariantRestoreInput = localeVariantListInput;

export const localeVariantMutationOutput = z.object({
  primaryDocumentId: z.string(),
});

export const localeVariantAssignment = z.object({
  _id: z.string(),
  routeId: z.string(),
  routeKey: z.string(),
  contentType: z.string(),
  groupId: z.string(),
  languageId: z.string(),
  language: Language.getOutputSchema(),
  documentId: z.string(),
});

export const localeVariantDocument = z.object({
  documentId: z.string(),
  role: z.enum(["primary", "variant"]),
  name: z.string().optional(),
  label: z.string(),
  assignedLanguages: z.array(Language.getOutputSchema()),
});

export const localeVariantListOutput = z.object({
  routeId: z.string(),
  routeKey: z.string(),
  contentType: z.string(),
  groupId: z.string(),
  primaryDocumentId: z.string(),
  currentDocumentId: z.string(),
  assignments: z.array(localeVariantAssignment),
  documents: z.array(localeVariantDocument),
});

export const localeVariantCreateOutput = z.object({
  document: z.record(z.string(), z.unknown()),
  variants: localeVariantListOutput,
});

export type LocaleVariantListInput = z.infer<typeof localeVariantListInput>;
export type LocaleVariantCreateInput = z.infer<typeof localeVariantCreateInput>;
export type LocaleVariantAssignInput = z.infer<typeof localeVariantAssignInput>;
export type LocaleVariantUnassignInput = z.infer<typeof localeVariantUnassignInput>;
export type LocaleVariantSetPrimaryInput = z.infer<
  typeof localeVariantSetPrimaryInput
>;
export type LocaleVariantTrashInput = z.infer<typeof localeVariantTrashInput>;
export type LocaleVariantRestoreInput = z.infer<typeof localeVariantRestoreInput>;
export type LocaleVariantMutationOutput = z.infer<
  typeof localeVariantMutationOutput
>;
export type LocaleVariantAssignment = z.infer<typeof localeVariantAssignment>;
export type LocaleVariantDocument = z.infer<typeof localeVariantDocument>;
export type LocaleVariantListOutput = z.infer<typeof localeVariantListOutput>;
export type LocaleVariantCreateOutput = z.infer<typeof localeVariantCreateOutput>;
