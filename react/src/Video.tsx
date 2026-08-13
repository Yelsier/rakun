import type { VideoHTMLAttributes } from 'react'

import { resolvePublicMediaUrl } from './mediaUrl'

export type RakunVideoSource = {
  key?: string | null
  url?: string | null
  mime?: string | null
  size?: number | null
}

export type RakunVideoMedia = {
  key?: string | null
  access?: 'public' | 'private' | string | null
  url?: string | null
  mime?: string | null
  name?: string | null
  title?: string | null
  width?: number | null
  height?: number | null
  sources?: RakunVideoSource[] | null
}

type VideoElementProps = VideoHTMLAttributes<HTMLVideoElement>

export type RakunVideoProps = Omit<VideoElementProps, 'height' | 'src' | 'title' | 'width'> & {
  video?: RakunVideoMedia | null
  src?: string | null
  type?: string | null
  sources?: RakunVideoSource[] | null
  fallbackSrc?: string | null
  title?: string | null
  width?: number | string | null
  height?: number | string | null
  mediaBaseUrl?: string | null
  mediaPublicPath?: string
}

type ResolvedVideoSource = {
  src: string
  type?: string
}

const sourcePriority = (source: ResolvedVideoSource): number => {
  const type = source.type?.toLowerCase()

  if (type === 'video/webm') return 0
  if (type === 'video/mp4') return 1
  return 2
}

const resolveVideoSources = ({
  video,
  src,
  type,
  sources,
  fallbackSrc,
  mediaBaseUrl,
  mediaPublicPath,
}: Pick<
  RakunVideoProps,
  'fallbackSrc' | 'mediaBaseUrl' | 'mediaPublicPath' | 'sources' | 'src' | 'type' | 'video'
>): ResolvedVideoSource[] => {
  const candidates: RakunVideoSource[] = [
    ...(sources ?? video?.sources ?? []),
    ...(src
      ? [{ url: src, mime: type ?? video?.mime }]
      : video?.url || video?.key
        ? [{ key: video.key, url: video.url, mime: video.mime }]
        : []),
    ...(fallbackSrc ? [{ url: fallbackSrc }] : []),
  ]

  const resolved = candidates.flatMap((source, index) => {
    const sourceUrl =
      source.url ||
      resolvePublicMediaUrl({
        key: source.key,
        access: video?.access,
        mediaBaseUrl,
        mediaPublicPath: mediaPublicPath ?? '/media/public',
      })

    if (!sourceUrl) return []

    return [
      {
        src: sourceUrl,
        type: source.mime || undefined,
        index,
      },
    ]
  })

  return resolved
    .filter(
      (source, index, all) => all.findIndex((candidate) => candidate.src === source.src) === index
    )
    .sort((a, b) => sourcePriority(a) - sourcePriority(b) || a.index - b.index)
    .map(({ src: sourceSrc, type: sourceType }) => ({
      src: sourceSrc,
      type: sourceType,
    }))
}

export function RakunVideo({
  video,
  src,
  type,
  sources,
  fallbackSrc,
  title,
  width,
  height,
  mediaBaseUrl,
  mediaPublicPath = '/media/public',
  children,
  ...videoProps
}: RakunVideoProps) {
  const resolvedSources = resolveVideoSources({
    video,
    src,
    type,
    sources,
    fallbackSrc,
    mediaBaseUrl,
    mediaPublicPath,
  })

  return (
    <video
      {...videoProps}
      title={title ?? video?.title ?? video?.name ?? undefined}
      width={width ?? video?.width ?? undefined}
      height={height ?? video?.height ?? undefined}
    >
      {resolvedSources.map((source) => (
        <source key={`${source.type ?? ''}:${source.src}`} src={source.src} type={source.type} />
      ))}
      {children}
    </video>
  )
}

export const Video = RakunVideo
