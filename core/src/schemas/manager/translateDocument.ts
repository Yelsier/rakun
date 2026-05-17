import z from "zod";

export const translateDocumentInput = z.object({
  contentType: z.string(),
  id: z.string(),
  from: z.string(),
  to: z.array(z.string()).min(1),
  overwrite: z.boolean(),
  data: z.any().optional(),
});

export const translateDocumentSummary = z.object({
  requestedLanguages: z.array(z.string()),
  translatedLanguages: z.array(z.string()),
  translatedSegments: z.number(),
  skippedSegments: z.number(),
  translatedFields: z.array(z.string()),
});

export const translateDocumentOutput = z.object({
  item: z.any(),
  summary: translateDocumentSummary,
});

export type TranslateDocumentInput = z.infer<typeof translateDocumentInput>;
export type TranslateDocumentSummary = z.infer<typeof translateDocumentSummary>;
export type TranslateDocumentOutput = z.infer<typeof translateDocumentOutput>;
