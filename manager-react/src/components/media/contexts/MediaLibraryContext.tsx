'use client'

import { createContext, useContext } from 'react'
import type { FileOptimizeOptions } from '@rakun/core/client'

import { FileUploadProps } from '../../ui/file-upload'

import type { MediaRecord } from '@/lib/media'

export type MediaTypeFilter = 'all' | 'image' | 'video' | 'document'

export type FolderItem = {
  _id: string
  name: string
  slug: string
  path: string
  parentId?: string
  description?: string
}

type FolderActionRequest = {
  id: string
  name: string
  requestId: number
}

type MediaLibraryContextValue = {
  currentFolderId: string | null
  currentFolderPath: string
  setCurrentFolderId: (folderId: string | null) => void
  folders?: FolderItem[]
  isLoadingFolders: boolean
  refetchFoldersTree: () => Promise<unknown>
  requestEditFolder: (folder: FolderItem) => void
  requestDeleteFolder: (folder: FolderItem) => void
  externalEditFolderRequest: FolderActionRequest | null
  externalDeleteFolderRequest: FolderActionRequest | null
  selectable: boolean
  multipleSelect: boolean
  selectedMediaIds?: Set<string>
  forcedMediaTypeFilter?: MediaTypeFilter
  onSelect?: (media: MediaRecord) => void
  onCreateFolder: (parentId: string | null, name: string) => Promise<void>
  onUpload: NonNullable<FileUploadProps['onUpload']>
  optimizeEnabled: boolean
  optimizeLocked: boolean
  optimizeOptions: FileOptimizeOptions
  setOptimizeEnabled: (value: boolean) => void
  setOptimizeOptions: (patch: Partial<FileOptimizeOptions>) => void
}

const MediaLibraryContext = createContext<MediaLibraryContextValue | null>(
  null,
)

export function MediaLibraryProvider({
  value,
  children,
}: {
  value: MediaLibraryContextValue
  children: React.ReactNode
}) {
  return (
    <MediaLibraryContext.Provider value={value}>
      {children}
    </MediaLibraryContext.Provider>
  )
}

export function useMediaLibrary() {
  const context = useContext(MediaLibraryContext)
  if (!context) {
    throw new Error('useMediaLibrary must be used within <MediaLibraryProvider>')
  }
  return context
}
