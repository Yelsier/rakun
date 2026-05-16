"use client";

import type { ImgHTMLAttributes } from "react";

export type RakunImageSize = {
  key?: string;
  url?: string | null;
  width: number;
  height?: number | null;
  mime?: string;
  size?: number;
};

export type RakunImageSource = {
  url?: string | null;
  previewUrl?: string | null;
  name?: string | null;
  title?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  sizes?: RakunImageSize[];
  srcSet?: string | null;
};

export type RakunImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "height" | "sizes" | "src" | "srcSet" | "title" | "width"
> & {
  image?: RakunImageSource | null;
  src?: string | null;
  previewSrc?: string | null;
  fallbackSrc?: string | null;
  usePreview?: boolean;
  alt?: string | null;
  title?: string | null;
  width?: number | string | null;
  height?: number | string | null;
  sizes?: string;
  imageSizes?: RakunImageSize[];
  srcSet?: string | null;
  includeOriginalInSrcSet?: boolean;
};

const buildSrcSet = ({
  src,
  width,
  sizes,
  includeOriginal,
}: {
  src?: string | null;
  width?: number | null;
  sizes?: RakunImageSize[];
  includeOriginal: boolean;
}): string | undefined => {
  const entries = (sizes ?? [])
    .filter((size) => size.url && Number.isFinite(size.width) && size.width > 0)
    .map((size) => ({
      url: size.url!,
      width: Math.round(size.width),
    }));

  if (
    includeOriginal &&
    src &&
    width &&
    Number.isFinite(width) &&
    width > 0 &&
    !entries.some((entry) => entry.width === width)
  ) {
    entries.push({ url: src, width: Math.round(width) });
  }

  const srcSet = entries
    .sort((a, b) => a.width - b.width)
    .map((entry) => `${entry.url} ${entry.width}w`)
    .join(", ");

  return srcSet || undefined;
};

export function RakunImage({
  image,
  src,
  previewSrc,
  fallbackSrc,
  usePreview = false,
  alt,
  title,
  width,
  height,
  sizes = "100vw",
  imageSizes,
  srcSet,
  includeOriginalInSrcSet = true,
  loading = "lazy",
  decoding = "async",
  ...imgProps
}: RakunImageProps) {
  const originalSrc = src ?? image?.url ?? fallbackSrc ?? undefined;
  const resolvedPreviewSrc = previewSrc ?? image?.previewUrl ?? undefined;
  const resolvedSrc = usePreview
    ? (resolvedPreviewSrc ?? originalSrc)
    : originalSrc;
  const resolvedWidth = width ?? image?.width ?? undefined;
  const resolvedHeight = height ?? image?.height ?? undefined;
  const numericWidth =
    typeof resolvedWidth === "number" ? resolvedWidth : image?.width;
  const responsiveSrcSet = usePreview
    ? undefined
    : (srcSet ??
      image?.srcSet ??
      buildSrcSet({
        src: originalSrc,
        width: numericWidth,
        sizes: imageSizes ?? image?.sizes,
        includeOriginal: includeOriginalInSrcSet,
      }));

  return (
    <img
      {...imgProps}
      src={resolvedSrc}
      srcSet={responsiveSrcSet || undefined}
      sizes={responsiveSrcSet ? sizes : undefined}
      alt={alt ?? image?.alt ?? image?.title ?? image?.name ?? ""}
      title={title ?? image?.title ?? undefined}
      width={resolvedWidth ?? undefined}
      height={resolvedHeight ?? undefined}
      loading={loading}
      decoding={decoding}
    />
  );
}

export const Image = RakunImage;
