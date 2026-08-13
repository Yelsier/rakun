import type { FileOptimizeOptions } from "../lib/fields/File";
import {
  optimizeImageUpload,
  type UploadOptimizationOutput,
} from "./imageOptimization";
import { optimizeVideoUpload } from "./videoOptimization";

type MediaOptimizationInput = {
  buffer: Buffer;
  mime: string;
  fileName: string;
  key: string;
  optimizeOptions?: FileOptimizeOptions;
};

const VIDEO_FILE_EXTENSION = /\.(?:mov|mp4|m4v|webm|avi|mkv)$/i;

export async function optimizeMediaUpload(
  input: MediaOptimizationInput,
): Promise<UploadOptimizationOutput> {
  if (
    input.optimizeOptions &&
    (input.mime.startsWith("video/") ||
      VIDEO_FILE_EXTENSION.test(input.fileName))
  ) {
    return await optimizeVideoUpload({
      ...input,
      optimizeOptions: input.optimizeOptions,
    });
  }

  return await optimizeImageUpload(input);
}
