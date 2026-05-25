import z from "zod";

export const createPreviewInput = z.object({
  contentType: z.string(),
  documentId: z.string().optional(),
  data: z.record(z.string(), z.any()),
  languageCode: z.string().optional(),
  routeKey: z.string().optional(),
});

export const createPreviewOutput = z.object({
  token: z.string(),
  path: z.string(),
  expiresAt: z.string(),
});

export type CreatePreviewInput = z.infer<typeof createPreviewInput>;
export type CreatePreviewOutput = z.infer<typeof createPreviewOutput>;
