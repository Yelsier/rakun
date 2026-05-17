import z from "zod";

export const duplicateInput = z.object({
  contentType: z.string(),
  id: z.string(),
});

export type DuplicateInput = z.infer<typeof duplicateInput>;
