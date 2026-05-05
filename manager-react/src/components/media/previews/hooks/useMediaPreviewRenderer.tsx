'use client'

import { useQueries } from '@tanstack/react-query'

import { FileTypeIcon, isImage, isVideo } from '../utils/mediaPreview'

import type { MediaRecord } from '@/lib/media'
import { cn } from '@/lib/utils'

type UseMediaPreviewRendererInput = {
  media: MediaRecord[]
  resolvePreviewUrl: (item: MediaRecord) => Promise<string>
}

export function useMediaPreviewRenderer({
  media,
  resolvePreviewUrl,
}: UseMediaPreviewRendererInput) {
  const previewUrlQueries = useQueries({
    queries: media.map((item) => ({
      queryKey: [
        'media-preview-url',
        item._id,
        item.previewKey || item.key,
        item.access,
      ],
      queryFn: async () => resolvePreviewUrl(item),
      staleTime: 1000 * 60,
    })),
  })

  const previewUrlById = new Map<string, string>()
  media.forEach((item, index) => {
    const resolved = previewUrlQueries[index]?.data
    if (resolved) previewUrlById.set(item._id, resolved)
  })

  const renderPreview = (item: MediaRecord, className = '') => {
    const src = previewUrlById.get(item._id)

    if (isImage(item.mime) && src) {
      return (
        <img
          src={src}
          alt={item.name}
          className={cn('h-full w-full object-cover', className)}
          loading='lazy'
        />
      )
    }

    if (isVideo(item.mime) && src) {
      return (
        <video
          src={src}
          className={cn('h-full w-full object-cover', className)}
        />
      )
    }

    return (
      <div className='flex h-full w-full items-center justify-center text-muted-foreground'>
        <FileTypeIcon mime={item.mime} />
      </div>
    )
  }

  return {
    renderPreview,
  }
}
