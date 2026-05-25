import z from "zod";

import { pageOutput } from "./page";

export const previewPageInput = z.object({
  token: z.string(),
  path: z.string(),
  search: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export const previewPageOutput = pageOutput;

export type PreviewPageInput = z.infer<typeof previewPageInput>;
export type PreviewPageOutput = z.infer<typeof previewPageOutput>;
