'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { MediaRecord } from '@/lib/media'

type UseExpandedPreviewInput = {
  selectable: boolean
  onSelect?: (media: MediaRecord) => void
  resolveOriginalUrl: (item: MediaRecord) => Promise<string>
}

export function useExpandedPreview({
  selectable,
  onSelect,
  resolveOriginalUrl,
}: UseExpandedPreviewInput) {
  const [expandedPreview, setExpandedPreview] = useState<MediaRecord | null>(null)

  const onMediaClick = (item: MediaRecord) => {
    if (selectable && onSelect) {
      onSelect(item)
      return
    }
    setExpandedPreview(item)
  }

  const { data: expandedOriginalUrl } = useQuery({
    queryKey: [
      'media-original-url',
      expandedPreview?._id,
      expandedPreview?.key,
      expandedPreview?.access,
    ],
    enabled: !!expandedPreview,
    queryFn: async () => {
      if (!expandedPreview) return ''
      return await resolveOriginalUrl(expandedPreview)
    },
    staleTime: 1000 * 60,
  })

  return {
    expandedPreview,
    expandedPreviewUrl: expandedOriginalUrl || '',
    setExpandedPreview,
    onMediaClick,
  }
}
