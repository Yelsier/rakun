'use client'

import { Image as RakunImage } from '@rakun-kit/react'
import { useQueries } from '@tanstack/react-query'

import { FileTypeIcon, isImage, isVideo } from '../utils/mediaPreview'

import type { MediaRecord } from '@/lib/media'
import { cn } from '@/lib/utils'

type UseMediaPreviewRendererInput = {
  media: MediaRecord[]
  sizes: string
  resolveMediaUrl: (item: MediaRecord) => Promise<string>
}

const isDataUrl = (value?: string | null) => !!value?.startsWith('data:')

/** Prefer a real preview variant over LQIP data URLs and over missing copy keys. */
export const getMediaDisplaySource = (item: {
  url?: string | null
  previewUrl?: string | null
  previewKey?: string | null
  key?: string | null
}) => {
  if (item.previewUrl && !isDataUrl(item.previewUrl)) {
    return {
      src: item.previewUrl,
      key: item.previewKey || item.key || undefined,
    }
  }

  if (item.url) {
    return {
      src: item.url,
      key: item.key || undefined,
    }
  }

  return {
    src: undefined as string | undefined,
    key: item.previewKey || item.key || undefined,
  }
}

export function useMediaPreviewRenderer({
  media,
  sizes,
  resolveMediaUrl,
}: UseMediaPreviewRendererInput) {
  const mediaUrlQueries = useQueries({
    queries: media.map((item) => ({
      queryKey: [
        'media-display-url',
        item._id,
        item.key,
        item.previewKey,
        item.access,
        item.url,
        item.previewUrl,
        item.sizes?.map((size) => size.url || size.key).join('|'),
        item.sources?.map((source) => source.url || source.key).join('|'),
      ],
      queryFn: async () => {
        const display = getMediaDisplaySource(item)
        if (display.src) return display.src
        return resolveMediaUrl(item)
      },
      staleTime: 1000 * 60,
    })),
  })

  const mediaUrlById = new Map<string, string>()
  media.forEach((item, index) => {
    const resolved = mediaUrlQueries[index]?.data
    if (resolved) mediaUrlById.set(item._id, resolved)
  })

  const renderPreview = (item: MediaRecord, className = '') => {
    const display = getMediaDisplaySource(item)
    const src = mediaUrlById.get(item._id) || display.src

    if (isImage(item.mime) && (src || item.sizes?.some((size) => size.url))) {
      return (
        <RakunImage
          image={{
            key: display.key,
            access: item.access,
            url: src || item.url,
            previewUrl: isDataUrl(item.previewUrl) ? item.previewUrl : undefined,
            name: item.name,
            title: item.title,
            alt: item.alt,
            width: item.width,
            height: item.height,
            sizes: item.sizes,
          }}
          sizes={sizes}
          className={cn('h-full w-full object-cover', className)}
          loading="lazy"
        />
      )
    }

    if (isVideo(item.mime) && src) {
      const sources = item.sources?.filter((source) => source.url)
      return (
        <video
          src={sources?.length ? undefined : src}
          className={cn('h-full w-full object-cover', className)}
        >
          {sources?.map((source) => (
            <source key={source.key} src={source.url} type={source.mime} />
          ))}
        </video>
      )
    }

    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <FileTypeIcon mime={item.mime} />
      </div>
    )
  }

  return {
    renderPreview,
  }
}
