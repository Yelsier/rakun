'use client'

import { useState } from 'react'
import { useManagerClient } from '@/client/react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DEFAULT_RESPONSIVE_IMAGE_WIDTHS, type FileOptimizeOptions } from '@rakun-kit/core/client'

import { FileUploadProps } from '../ui/file-upload'
import { FolderItem, MediaLibraryProvider } from './contexts/MediaLibraryContext'
import FoldersTree from './folders/FoldersTree'
import Previews from './previews/Previews'

import { type MediaRecord } from '@/lib/media'
import { useMedia } from '@/media'
import { cn } from '@/lib/utils'

export type MediaLibraryProps = {
  selectable?: boolean
  onSelect?: (media: MediaRecord) => void
  className?: string
  isModal?: boolean
  multipleSelect?: boolean
  selectedMediaIds?: Set<string>
  forcedMediaTypeFilter?: 'all' | 'image' | 'video' | 'document'
  optimizeOptions?: FileOptimizeOptions
}

export default function MediaLibrary({
  className,
  selectable = false,
  onSelect,
  isModal = false,
  multipleSelect = false,
  selectedMediaIds,
  forcedMediaTypeFilter,
  optimizeOptions,
}: MediaLibraryProps) {
  const managerClient = useManagerClient()
  const { uploadMedia } = useMedia()

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [libraryOptimizeEnabled, setLibraryOptimizeEnabled] = useState(false)
  const [libraryOptimizeOptions, setLibraryOptimizeOptions] = useState<FileOptimizeOptions>({
    format: 'webp',
    quality: 80,
    generatePreview: false,
    generateSizes: true,
    responsiveSizes: [...DEFAULT_RESPONSIVE_IMAGE_WIDTHS],
    minBytesToOptimize: 350 * 1024,
    previewMaxWidth: 480,
  })
  const [externalEditFolderRequest, setExternalEditFolderRequest] = useState<{
    id: string
    name: string
    path: string
    parentId?: string
    requestId: number
  } | null>(null)
  const [externalDeleteFolderRequest, setExternalDeleteFolderRequest] = useState<{
    id: string
    name: string
    path: string
    parentId?: string
    requestId: number
  } | null>(null)
  const [, setFolderRequestSeq] = useState(0)

  const {
    data: folders,
    isLoading: isLoadingFolders,
    refetch: refetchFolders,
  } = useQuery({
    queryKey: ['media-folder-tree'],
    queryFn: async (): Promise<FolderItem[]> => {
      const visited = new Set<string>()
      const result: FolderItem[] = []

      const walk = async (parentId?: string) => {
        const response = (await managerClient.request(
          'manager.media.listFolders',
          parentId ? { parentId } : {}
        )) as { items: FolderItem[] }

        for (const item of response.items) {
          if (visited.has(item._id)) continue
          visited.add(item._id)
          result.push(item)
          await walk(item._id)
        }
      }

      await walk()
      return result
    },
  })

  const currentFolder = currentFolderId
    ? ((folders ?? []).find((folder) => folder._id === currentFolderId) ?? null)
    : null

  const onCreateFolder = async (parentId: string | null, name: string) => {
    try {
      const created = (await managerClient.request('manager.media.createFolder', {
        name,
        parentId: parentId || undefined,
      })) as { _id: string }
      await refetchFolders()
      setCurrentFolderId(created._id)
      toast.success('Folder created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create folder')
    }
  }

  const requestEditFolder = (folder: FolderItem) => {
    setFolderRequestSeq((prev) => {
      const next = prev + 1
      setExternalEditFolderRequest({
        id: folder._id,
        name: folder.name,
        path: folder.path,
        parentId: folder.parentId,
        requestId: next,
      })
      return next
    })
  }

  const requestDeleteFolder = (folder: FolderItem) => {
    setFolderRequestSeq((prev) => {
      const next = prev + 1
      setExternalDeleteFolderRequest({
        id: folder._id,
        name: folder.name,
        path: folder.path,
        parentId: folder.parentId,
        requestId: next,
      })
      return next
    })
  }

  const onUpload: NonNullable<FileUploadProps['onUpload']> = async (
    files,
    { onProgress, onSuccess, onError }
  ) => {
    const effectiveOptimizeOptions = optimizeOptions
      ? optimizeOptions
      : libraryOptimizeEnabled
        ? libraryOptimizeOptions
        : undefined

    const results = await Promise.allSettled(
      files.map(async (file) => {
        try {
          onProgress(file, 10)
          await uploadMedia({
            file,
            folderId: currentFolderId || undefined,
            folderPath: currentFolder?.path,
            optimizeOptions: effectiveOptimizeOptions,
          })
          onProgress(file, 100)
          onSuccess(file)
        } catch (error) {
          const uploadError = error instanceof Error ? error : new Error('Upload failed')
          onError(file, uploadError)
          throw uploadError
        }
      })
    )

    const failedCount = results.filter((result) => result.status === 'rejected').length

    if (failedCount > 0) {
      throw new Error(
        failedCount === 1 ? '1 file failed to upload' : `${failedCount} files failed to upload`
      )
    }
  }

  const mediaLibraryContext = {
    currentFolderId,
    currentFolderPath: currentFolder?.path || '/',
    setCurrentFolderId,
    folders,
    isLoadingFolders,
    refetchFoldersTree: refetchFolders,
    requestEditFolder,
    requestDeleteFolder,
    externalEditFolderRequest,
    externalDeleteFolderRequest,
    selectable,
    multipleSelect,
    selectedMediaIds,
    forcedMediaTypeFilter,
    onSelect,
    onCreateFolder,
    onUpload,
    optimizeEnabled: !!optimizeOptions || libraryOptimizeEnabled,
    optimizeLocked: !!optimizeOptions,
    optimizeOptions: optimizeOptions || libraryOptimizeOptions,
    setOptimizeEnabled: setLibraryOptimizeEnabled,
    setOptimizeOptions: (patch: Partial<FileOptimizeOptions>) => {
      setLibraryOptimizeOptions((prev) => ({ ...prev, ...patch }))
    },
  }

  return (
    <MediaLibraryProvider value={mediaLibraryContext}>
      <div
        className={cn(
          'relative grid h-full min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]',
          className
        )}
      >
        <FoldersTree isModal={isModal} />

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden p-4">
          <p className="mb-4 shrink-0 text-muted-foreground text-sm">
            Current folder:{' '}
            <span className="font-medium text-foreground">{currentFolder?.path || '/'}</span>
          </p>
          <div className="min-h-0 flex-1">
            <Previews />
          </div>
        </div>
      </div>
    </MediaLibraryProvider>
  )
}
