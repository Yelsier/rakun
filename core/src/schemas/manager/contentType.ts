import z from "zod";

export const contentTypeInput = z.object({
  contentType: z.string(),
});

export type ContentTypeInput = z.infer<typeof contentTypeInput>;
