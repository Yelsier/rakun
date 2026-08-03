import z from "zod";

import { FileOptimizeOptionsSchema } from "../../../lib/fields/File";
import { mediaRecordOutput } from "./finalizeUpload";

export const reimportMediaInput = z.object({
  id: z.string().min(1),
  optimizeOptions: FileOptimizeOptionsSchema,
});

export const reimportMediaOutput = mediaRecordOutput;

export type ReimportMediaInput = z.infer<typeof reimportMediaInput>;
export type ReimportMediaOutput = z.infer<typeof reimportMediaOutput>;
