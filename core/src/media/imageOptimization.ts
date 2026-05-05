import path from "path";

import sharp from "sharp";
import {
  FileOptimizeOptions,
  FileOptimizeOptionsSchema,
} from "../lib/fields/File";

type UploadOptimizationInput = {
  buffer: Buffer;
  mime: string;
  fileName: string;
  key: string;
  optimizeOptions?: FileOptimizeOptions;
};

type UploadOptimizationOutput = {
  key: string;
  mime: string;
  size: number;
  fileName: string;
  optimized: boolean;
  optimizedFormat?: string;
  optimizationQuality?: number;
  originalSize: number;
  width?: number;
  height?: number;
  orientation?: "portrait" | "landscape";
  content: Buffer;
  preview?: {
    key: string;
    mime: string;
    size: number;
    content: Buffer;
  };
};

const formatToExt: Record<
  NonNullable<FileOptimizeOptions["format"]>,
  string
> = {
  webp: "webp",
  jpeg: "jpg",
  png: "png",
  avif: "avif",
};

const formatToMime: Record<
  NonNullable<FileOptimizeOptions["format"]>,
  string
> = {
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
  avif: "image/avif",
};

const isImageMime = (value: string): boolean => value.startsWith("image/");

const replaceExtension = (fileName: string, ext: string): string => {
  const parsed = path.parse(fileName);
  return `${parsed.name}.${ext}`;
};

const replaceKeyExtension = (key: string, ext: string): string => {
  const parsed = path.posix.parse(key);
  return path.posix.join(parsed.dir, `${parsed.name}.${ext}`);
};

const buildPreviewKey = (key: string, ext: string): string => {
  const parsed = path.posix.parse(key);
  return path.posix.join(parsed.dir, `${parsed.name}.preview.${ext}`);
};

const resolveDimensions = async (
  mime: string,
  content: Buffer,
): Promise<{
  width?: number;
  height?: number;
  orientation?: "portrait" | "landscape";
}> => {
  if (!isImageMime(mime)) return {};

  try {
    const metadata = await sharp(content, { failOn: "none" }).metadata();
    const width = metadata.width;
    const height = metadata.height;
    if (!width || !height) return {};

    return {
      width,
      height,
      orientation: width >= height ? "landscape" : "portrait",
    };
  } catch {
    return {};
  }
};

export async function optimizeImageUpload(
  input: UploadOptimizationInput,
): Promise<UploadOptimizationOutput> {
  const originalSize = input.buffer.length;

  if (!input.optimizeOptions || !isImageMime(input.mime)) {
    const dimensions = await resolveDimensions(input.mime, input.buffer);
    return {
      key: input.key,
      mime: input.mime,
      size: originalSize,
      fileName: input.fileName,
      optimized: false,
      originalSize,
      ...dimensions,
      content: input.buffer,
    };
  }

  const options = FileOptimizeOptionsSchema.parse(input.optimizeOptions);

  if (originalSize < options.minBytesToOptimize) {
    const dimensions = await resolveDimensions(input.mime, input.buffer);
    return {
      key: input.key,
      mime: input.mime,
      size: originalSize,
      fileName: input.fileName,
      optimized: false,
      originalSize,
      ...dimensions,
      content: input.buffer,
    };
  }

  const targetFormat = options.format;
  const targetExt = formatToExt[targetFormat];
  const targetMime = formatToMime[targetFormat];
  const quality = options.quality;

  let optimized = sharp(input.buffer, { failOn: "none" }).rotate();
  if (targetFormat === "webp") optimized = optimized.webp({ quality });
  if (targetFormat === "jpeg") optimized = optimized.jpeg({ quality });
  if (targetFormat === "png") optimized = optimized.png({ quality });
  if (targetFormat === "avif") optimized = optimized.avif({ quality });
  const optimizedBuffer = await optimized.toBuffer();

  const shouldUseOptimized = optimizedBuffer.length < originalSize;
  const finalBuffer = shouldUseOptimized ? optimizedBuffer : input.buffer;
  const finalMime = shouldUseOptimized ? targetMime : input.mime;
  const finalExt = shouldUseOptimized
    ? targetExt
    : path.parse(input.fileName).ext.replace(".", "") || targetExt;
  const finalKey = shouldUseOptimized
    ? replaceKeyExtension(input.key, finalExt)
    : input.key;
  const finalFileName = shouldUseOptimized
    ? replaceExtension(input.fileName, finalExt)
    : input.fileName;

  let preview:
    | {
        key: string;
        mime: string;
        size: number;
        content: Buffer;
      }
    | undefined;

  if (options.generatePreview) {
    let previewPipeline = sharp(finalBuffer, { failOn: "none" })
      .rotate()
      .resize({ width: options.previewMaxWidth, withoutEnlargement: true });
    if (targetFormat === "webp")
      previewPipeline = previewPipeline.webp({ quality });
    if (targetFormat === "jpeg")
      previewPipeline = previewPipeline.jpeg({ quality });
    if (targetFormat === "png")
      previewPipeline = previewPipeline.png({ quality });
    if (targetFormat === "avif")
      previewPipeline = previewPipeline.avif({ quality });

    const previewContent = await previewPipeline.toBuffer();
    preview = {
      key: buildPreviewKey(finalKey, targetExt),
      mime: targetMime,
      size: previewContent.length,
      content: previewContent,
    };
  }

  const dimensions = await resolveDimensions(finalMime, finalBuffer);

  return {
    key: finalKey,
    mime: finalMime,
    size: finalBuffer.length,
    fileName: finalFileName,
    optimized: shouldUseOptimized,
    optimizedFormat: shouldUseOptimized ? targetFormat : undefined,
    optimizationQuality: shouldUseOptimized ? quality : undefined,
    originalSize,
    ...dimensions,
    content: finalBuffer,
    preview,
  };
}
