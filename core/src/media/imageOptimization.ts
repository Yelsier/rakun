import path from "path";

import {
  FileOptimizeOptions,
  FileOptimizeOptionsSchema,
} from "../lib/fields/File";
import { getPlatform } from '../platform'

type UploadOptimizationInput = {
  buffer: Buffer;
  mime: string;
  fileName: string;
  key: string;
  optimizeOptions?: FileOptimizeOptions;
};

export type UploadOptimizationOutput = {
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
    dataUrl: string;
    mime: string;
  };
  sizes?: Array<{
    key: string;
    mime: string;
    size: number;
    width: number;
    height: number;
    content: Buffer;
  }>;
  sources?: Array<{
    key: string;
    mime: "video/mp4" | "video/webm";
    size: number;
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

const buildSizeKey = (key: string, width: number, ext: string): string => {
  const parsed = path.posix.parse(key);
  return path.posix.join(parsed.dir, `${parsed.name}.${width}w.${ext}`);
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
    const metadata = await getPlatform().image.metadata(content)
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

  const targetExt = formatToExt[format];
  const targetMime = formatToMime[format];
  const targetWidths = normalizeResponsiveWidths(widths, sourceWidth);

  return Promise.all(
    targetWidths.map(async (width) => {
      const resized = Buffer.from(
        await getPlatform().image.transform(content, {
          width,
          withoutEnlargement: true,
          autoOrient: true,
          format,
          quality,
        }),
      )
      const metadata = await getPlatform().image.metadata(resized)

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

const PREVIEW_DATA_URL_QUALITY = 20;

const generatePreviewDataUrl = async ({
  content,
  format,
  maxWidth,
}: {
  content: Buffer;
  format: NonNullable<FileOptimizeOptions["format"]>;
  maxWidth: number;
}): Promise<NonNullable<UploadOptimizationOutput["preview"]>> => {
  return await getPlatform().image.placeholder(content, {
    width: maxWidth,
    withoutEnlargement: true,
    autoOrient: true,
    format,
    quality: PREVIEW_DATA_URL_QUALITY,
  })
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
    const preview = options.generatePreview
      ? await generatePreviewDataUrl({
          content: input.buffer,
          format: targetFormat,
          maxWidth: options.previewMaxWidth,
        })
      : undefined;

    return {
      key: input.key,
      mime: input.mime,
      size: originalSize,
      fileName: input.fileName,
      optimized: false,
      originalSize,
      ...dimensions,
      content: input.buffer,
      preview,
      sizes: sizes.length ? sizes : undefined,
    };
  }

  const optimizedBuffer = Buffer.from(
    await getPlatform().image.transform(input.buffer, {
      autoOrient: true,
      format: targetFormat,
      quality,
    }),
  )

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

  const preview = options.generatePreview
    ? await generatePreviewDataUrl({
        content: finalBuffer,
        format: targetFormat,
        maxWidth: options.previewMaxWidth,
      })
    : undefined;

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
