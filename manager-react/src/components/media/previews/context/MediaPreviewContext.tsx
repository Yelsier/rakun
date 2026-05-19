'use client'

import { createContext, useContext } from 'react'

import type { MediaRecord } from '@/lib/media'
import type { FolderItem } from '@/components/media/contexts/MediaLibraryContext'

export type MediaTypeFilter = 'all' | 'image' | 'video' | 'document'
export type ViewMode = 'list' | 'grid-sm' | 'grid-lg'

type MediaPreviewContextValue = {
  mediaCount: number
  isUploading: boolean
  mediaTypeFilter: MediaTypeFilter
  isMediaTypeFilterLocked: boolean
  setMediaTypeFilter: (value: MediaTypeFilter) => void
  viewMode: ViewMode
  setViewMode: (value: ViewMode) => void
  isSelected: (id: string) => boolean
  selectionMode: boolean
  bulkSelectedIds: Set<string>
  bulkSelectedCount: number
  canBulkSelect: boolean
  onMediaClick: (media: MediaRecord) => void
  onToggleBulkSelection: (media: MediaRecord) => void
  onSelectVisible: (media: MediaRecord[], selected: boolean) => void
  onRequestSelect: (item: MediaRecord) => void
  onRequestBulkDelete: () => void
  onRequestBulkMove: () => void
  onClearSelection: () => void
  onRequestEdit: (item: MediaRecord | FolderItem) => void
  onRequestImageEdit: (item: MediaRecord) => void
  onRequestMove: (item: MediaRecord) => void
  onRequestDelete: (item: MediaRecord | FolderItem) => void
  renderPreview: (item: MediaRecord, className?: string) => React.ReactNode
  formatFileSize: (bytes: number) => string
}

const MediaPreviewContext = createContext<MediaPreviewContextValue | null>(null)

export function MediaPreviewProvider({
  value,
  children,
}: {
  value: MediaPreviewContextValue
  children: React.ReactNode
}) {
  return (
    <MediaPreviewContext.Provider value={value}>
      {children}
    </MediaPreviewContext.Provider>
  )
}

export function useMediaPreview() {
  const context = useContext(MediaPreviewContext)
  if (!context) {
    throw new Error(
      'useMediaPreview must be used within <MediaPreviewProvider>',
    )
  }
  return context
}
