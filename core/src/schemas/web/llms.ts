import z from "zod";

export const llmsInput = z.object({
  language: z.string().optional(),
});

export const llmsOutput = z
  .object({
    content: z.string(),
    language: z.string(),
  })
  .nullable();

export type LlmsInput = z.input<typeof llmsInput>;
export type LlmsOutput = z.output<typeof llmsOutput>;
