import z from "zod";

import {
  finalizeUploadInput,
  mediaRecordOutput,
} from "./finalizeUpload";

export const replaceMediaInput = finalizeUploadInput
  .omit({
    name: true,
    folderId: true,
    folderPath: true,
    status: true,
    purpose: true,
  })
  .extend({
    id: z.string().min(1),
  });

export const replaceMediaOutput = mediaRecordOutput;

export type ReplaceMediaInput = z.infer<typeof replaceMediaInput>;
export type ReplaceMediaOutput = z.infer<typeof replaceMediaOutput>;
