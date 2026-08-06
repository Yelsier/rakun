"use client";

import type { ImgHTMLAttributes } from "react";

type ImageFetchPriority = "high" | "low" | "auto";
type ImageElementProps = ImgHTMLAttributes<HTMLImageElement> & {
  fetchPriority?: ImageFetchPriority;
};

export type RakunImageSize = {
  key?: string;
  url?: string | null;
  width: number;
  height?: number | null;
  mime?: string;
  size?: number;
};

export type RakunImageSource = {
  key?: string | null;
  access?: "public" | "private" | string | null;
  url?: string | null;
  previewKey?: string | null;
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
  ImageElementProps,
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
  mediaBaseUrl?: string | null;
  mediaPublicPath?: string;
  includeOriginalInSrcSet?: boolean;
  priority?: boolean;
};

const encodeMediaPath = (value: string): string =>
  value
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

const joinUrlPath = (baseUrl: string | null | undefined, pathname: string) => {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (!baseUrl) return normalizedPath;

  return `${baseUrl.replace(/\/$/, "")}${normalizedPath}`;
};

const resolvePublicMediaUrl = ({
  key,
  access,
  mediaBaseUrl,
  mediaPublicPath,
}: {
  key?: string | null;
  access?: string | null;
  mediaBaseUrl?: string | null;
  mediaPublicPath: string;
}): string | undefined => {
  if (!key || access === "private") return undefined;

  const publicKey = key.startsWith("public/")
    ? key.slice("public/".length)
    : key;
  const encodedKey = encodeMediaPath(publicKey);

  if (!encodedKey) return undefined;

  return joinUrlPath(mediaBaseUrl, `${mediaPublicPath}/${encodedKey}`);
};

const buildSrcSet = ({
  src,
  width,
  sizes,
  access,
  mediaBaseUrl,
  mediaPublicPath,
  includeOriginal,
}: {
  src?: string | null;
  width?: number | null;
  sizes?: RakunImageSize[];
  access?: string | null;
  mediaBaseUrl?: string | null;
  mediaPublicPath: string;
  includeOriginal: boolean;
}): string | undefined => {
  const entries = (sizes ?? [])
    .map((size) => ({
      url:
        size.url ||
        resolvePublicMediaUrl({
          key: size.key,
          access,
          mediaBaseUrl,
          mediaPublicPath,
        }),
      width: size.width,
    }))
    .filter(
      (size): size is { url: string; width: number } =>
        !!size.url && Number.isFinite(size.width) && size.width > 0,
    )
    .map((size) => ({
      url: size.url,
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
  mediaBaseUrl,
  mediaPublicPath = "/media/public",
  includeOriginalInSrcSet = true,
  priority = false,
  loading = "lazy",
  decoding = "async",
  style,
  ...imgProps
}: RakunImageProps) {
  const resolvedImgProps: ImageElementProps = {
    ...imgProps,
    ...(priority ? { fetchPriority: "high" as const } : {}),
  };
  const resolvedOriginalFromKey = resolvePublicMediaUrl({
    key: image?.key,
    access: image?.access,
    mediaBaseUrl,
    mediaPublicPath,
  });
  const resolvedPreviewFromKey = resolvePublicMediaUrl({
    key: image?.previewKey,
    access: image?.access,
    mediaBaseUrl,
    mediaPublicPath,
  });
  const originalSrc =
    src || image?.url || resolvedOriginalFromKey || fallbackSrc || undefined;
  const resolvedPreviewSrc =
    previewSrc || image?.previewUrl || resolvedPreviewFromKey || undefined;
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
        access: image?.access,
        mediaBaseUrl,
        mediaPublicPath,
        includeOriginal: includeOriginalInSrcSet,
      }));
  const inlinePreviewSrc =
    !usePreview &&
    resolvedPreviewSrc &&
    resolvedPreviewSrc.startsWith("data:")
      ? resolvedPreviewSrc
      : undefined;

  return (
    <img
      {...resolvedImgProps}
      src={resolvedSrc}
      srcSet={responsiveSrcSet || undefined}
      sizes={responsiveSrcSet ? sizes : undefined}
      alt={alt ?? image?.alt ?? image?.title ?? image?.name ?? ""}
      title={title ?? image?.title ?? undefined}
      width={resolvedWidth ?? undefined}
      height={resolvedHeight ?? undefined}
      loading={priority ? "eager" : loading}
      decoding={decoding}
      style={
        inlinePreviewSrc
          ? {
              ...style,
              backgroundImage: `url("${inlinePreviewSrc}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : style
      }
    />
  );
}

export const Image = RakunImage;
