import z from "zod";

export const linkedIteratorMode = z.enum(["linked", "unlinked"]);
export type LinkedIteratorMode = z.infer<typeof linkedIteratorMode>;

export const linkedIteratorAction = z.enum(["initialize", "update"]);
export type LinkedIteratorAction = z.infer<typeof linkedIteratorAction>;

export const linkedIteratorControl = z.object({
  mode: linkedIteratorMode,
  action: linkedIteratorAction.optional(),
  revision: z.number().int().nonnegative().optional(),
});
export type LinkedIteratorControl = z.infer<typeof linkedIteratorControl>;

export const linkedIteratorGetInput = z.object({
  contentType: z.string(),
  documentId: z.string().optional(),
});
export type LinkedIteratorGetInput = z.infer<typeof linkedIteratorGetInput>;

export const linkedIteratorStateOutput = z.object({
  enabled: z.boolean(),
  configured: z.boolean(),
  mode: linkedIteratorMode,
  iterator: z.any().optional(),
  revision: z.number().int().nonnegative().optional(),
  canUpdateShared: z.boolean(),
});
export type LinkedIteratorStateOutput = z.infer<
  typeof linkedIteratorStateOutput
>;
