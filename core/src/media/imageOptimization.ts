import path from "path";

import {
  FileOptimizeOptions,
  FileOptimizeOptionsSchema,
} from "../lib/fields/File";
import { requirePeerDependency } from "../lib/utils/peerDependencies";

type Sharp = typeof import("sharp");
type SharpFactory = Sharp;

const getSharp = (): SharpFactory => {
  const sharp = requirePeerDependency<Sharp & { default?: SharpFactory }>(
    "sharp",
    "npm install sharp",
    "Rakun uses sharp to read image dimensions and optimize media uploads.",
  );
  return sharp.default ?? (sharp as unknown as SharpFactory);
};

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
  sizes?: Array<{
    key: string;
    mime: string;
    size: number;
    width: number;
    height: number;
    content: Buffer;
  }>;
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

const buildSizeKey = (key: string, width: number, ext: string): string => {
  const parsed = path.posix.parse(key);
  return path.posix.join(parsed.dir, `${parsed.name}.${width}w.${ext}`);
};

const applyFormat = (
  pipeline: ReturnType<SharpFactory>,
  format: NonNullable<FileOptimizeOptions["format"]>,
  quality: number,
) => {
  if (format === "webp") return pipeline.webp({ quality });
  if (format === "jpeg") return pipeline.jpeg({ quality });
  if (format === "png") return pipeline.png({ quality });
  return pipeline.avif({ quality });
};

const normalizeResponsiveWidths = (
  widths: number[],
  sourceWidth: number,
): number[] =>
  Array.from(
    new Set(
      widths
        .map((width) => Math.round(width))
        .filter((width) => Number.isFinite(width) && width > 0),
    ),
  )
    .filter((width) => width < sourceWidth)
    .sort((a, b) => a - b);

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
    const sharp = getSharp();
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

const generateResponsiveSizes = async ({
  content,
  key,
  sourceWidth,
  format,
  quality,
  widths,
}: {
  content: Buffer;
  key: string;
  sourceWidth?: number;
  format: NonNullable<FileOptimizeOptions["format"]>;
  quality: number;
  widths: number[];
}): Promise<NonNullable<UploadOptimizationOutput["sizes"]>> => {
  if (!sourceWidth) return [];

  const sharp = getSharp();
  const targetExt = formatToExt[format];
  const targetMime = formatToMime[format];
  const targetWidths = normalizeResponsiveWidths(widths, sourceWidth);

  return Promise.all(
    targetWidths.map(async (width) => {
      const resized = await applyFormat(
        sharp(content, { failOn: "none" })
          .rotate()
          .resize({ width, withoutEnlargement: true }),
        format,
        quality,
      ).toBuffer();
      const metadata = await sharp(resized, { failOn: "none" }).metadata();

      return {
        key: buildSizeKey(key, width, targetExt),
        mime: targetMime,
        size: resized.length,
        width: metadata.width ?? width,
        height: metadata.height ?? 1,
        content: resized,
      };
    }),
  );
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
  const targetFormat = options.format;
  const targetExt = formatToExt[targetFormat];
  const targetMime = formatToMime[targetFormat];
  const quality = options.quality;

  if (originalSize < options.minBytesToOptimize) {
    const dimensions = await resolveDimensions(input.mime, input.buffer);
    const sizes = options.generateSizes
      ? await generateResponsiveSizes({
          content: input.buffer,
          key: input.key,
          sourceWidth: dimensions.width,
          format: targetFormat,
          quality,
          widths: options.responsiveSizes,
        })
      : [];

    return {
      key: input.key,
      mime: input.mime,
      size: originalSize,
      fileName: input.fileName,
      optimized: false,
      originalSize,
      ...dimensions,
      content: input.buffer,
      sizes: sizes.length ? sizes : undefined,
    };
  }

  const sharp = getSharp();

  const optimizedBuffer = await applyFormat(
    sharp(input.buffer, { failOn: "none" }).rotate(),
    targetFormat,
    quality,
  ).toBuffer();

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
    const previewContent = await applyFormat(
      sharp(finalBuffer, { failOn: "none" })
        .rotate()
        .resize({ width: options.previewMaxWidth, withoutEnlargement: true }),
      targetFormat,
      quality,
    ).toBuffer();
    preview = {
      key: buildPreviewKey(finalKey, targetExt),
      mime: targetMime,
      size: previewContent.length,
      content: previewContent,
    };
  }

  const dimensions = await resolveDimensions(finalMime, finalBuffer);
  const sizes = options.generateSizes
    ? await generateResponsiveSizes({
        content: finalBuffer,
        key: finalKey,
        sourceWidth: dimensions.width,
        format: targetFormat,
        quality,
        widths: options.responsiveSizes,
      })
    : [];

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
    sizes: sizes.length ? sizes : undefined,
  };
}
