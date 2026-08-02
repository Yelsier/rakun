import z from "zod";

export const templateGetInput = z.object({
  contentType: z.string(),
  documentId: z.string().optional(),
});

export type TemplateGetInput = z.infer<typeof templateGetInput>;

export const templateUpdateInput = z.object({
  contentType: z.string(),
  modules: z.array(z.unknown()),
  revision: z.number().int().positive().optional(),
});

export type TemplateUpdateInput = z.infer<typeof templateUpdateInput>;

export const templateStateOutput = z.object({
  enabled: z.boolean(),
  configured: z.boolean(),
  modules: z.array(z.unknown()),
  revision: z.number().int().positive().optional(),
  canUpdate: z.boolean(),
});

export type TemplateStateOutput = z.infer<typeof templateStateOutput>;
