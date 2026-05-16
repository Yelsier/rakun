'use client'

import { Folder, FolderPlus, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  createManagerQueryKey,
  useManagerClient,
  useManagerMutation,
  useManagerQuery,
} from '@/client/react'
import { toast } from 'sonner'

import { Button } from '../../ui/button'
import { Card } from '../../ui/card'
import { ContextMenu, ContextMenuTrigger } from '../../ui/context-menu'
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
} from '../../ui/file-upload'
import { ScrollArea } from '../../ui/scroll-area'
import { Skeleton } from '../../ui/skeleton'
import { useMediaLibrary } from '../contexts/MediaLibraryContext'
import MediaContextMenuContent from './MediaContextMenuContent'
import { MediaPreviewProvider } from './context/MediaPreviewContext'
import ExpandedPreviewDialog from './dialogs/ExpandedPreviewDialog'
import MediaCreateFolderDialog from './dialogs/MediaCreateFolderDialog'
import MediaDeleteDialog from './dialogs/MediaDeleteDialog'
import MediaEditDialog from './dialogs/MediaEditDialog'
import MediaMoveDialog from './dialogs/MediaMoveDialog'
import { useExpandedPreview } from './hooks/useExpandedPreview'
import { useMediaPreviewRenderer } from './hooks/useMediaPreviewRenderer'
import { useMediaUpload } from './hooks/useMediaUpload'
import PreviewsToolbar from './toolbar/PreviewsToolbar'
import { formatFileSize } from './utils/mediaPreview'
import PreviewsGridLargeView from './views/PreviewsGridLargeView'
import PreviewsGridSmallView from './views/PreviewsGridSmallView'
import PreviewsListView from './views/PreviewsListView'
import PreviewsViewLoader from './views/PreviewsViewLoader'

import type { MediaRecord } from '@/lib/media'
import type { FolderItem } from '@/components/media/contexts/MediaLibraryContext'

type ViewMode = 'list' | 'grid-sm' | 'grid-lg'
type DeleteTarget = {
  contentType: 'Media' | 'MediaFolder'
  id: string
  name: string
  path?: string
  parentId?: string
}

type MoveTarget = {
  id: string
  name: string
  currentFolderId?: string
}

const ROOT_FOLDER_VALUE = '__root__'

const isMediaRecord = (item: MediaRecord | FolderItem): item is MediaRecord =>
  '_type' in item && item._type === 'Media'

export default function Previews() {
  const managerClient = useManagerClient()
  const queryClient = useQueryClient()
  const {
    currentFolderId,
    setCurrentFolderId,
    folders,
    onCreateFolder,
    refetchFoldersTree,
    forcedMediaTypeFilter,
    externalEditFolderRequest,
    externalDeleteFolderRequest,
    selectable,
    selectedMediaIds,
    onSelect,
    onUpload,
  } = useMediaLibrary()

  const [viewMode, setViewMode] = useState<ViewMode>('grid-sm')
  const [mediaTypeFilter, setMediaTypeFilter] = useState<
    'all' | 'image' | 'video' | 'document'
  >('all')
  const effectiveMediaTypeFilter = forcedMediaTypeFilter ?? mediaTypeFilter
  const isMediaTypeFilterLocked =
    !!forcedMediaTypeFilter && forcedMediaTypeFilter !== 'all'

  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] =
    useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [editTarget, setEditTarget] = useState<DeleteTarget | null>(null)
  const [editName, setEditName] = useState('')
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null)
  const [destinationFolderId, setDestinationFolderId] = useState('')

  const getMediaQueryFilter = (
    folderId: string | null,
    mediaType: 'all' | 'image' | 'video' | 'document',
  ) => {
    const folderFilter = folderId
      ? { 'folder._id': folderId }
      : { folder: { $exists: false } }

    switch (mediaType) {
      case 'image':
        return { ...folderFilter, mime: { $regex: '^image/' } }
      case 'video':
        return { ...folderFilter, mime: { $regex: '^video/' } }
      case 'document':
        return {
          ...folderFilter,
          $or: [
            { mime: { $regex: '^application/' } },
            { mime: { $regex: '^text/' } },
          ],
        }
      default:
        return folderFilter
    }
  }

  const mediaListInput = {
    contentType: 'Media' as const,
    query: {
      filter: getMediaQueryFilter(currentFolderId, effectiveMediaTypeFilter),
      options: {
        limit: 'all' as const,
        sort: {
          uploadedAt: 'desc' as const,
        },
      },
    },
  }

  const { data, isLoading, refetch } = useManagerQuery({
    name: 'manager.list',
    input: mediaListInput,
  })

  const {
    data: childFolders,
    isLoading: isLoadingChildFolders,
    refetch: refetchChildFolders,
  } = useManagerQuery({
    name: 'manager.media.listFolders',
    input: currentFolderId ? { parentId: currentFolderId } : {},
  })

  const deleteMutation = useManagerMutation('manager.delete')
  const deleteFolderMutation = useManagerMutation('manager.media.deleteFolder')
  const updateMutation = useManagerMutation('manager.update')

  const media = ((data as { items?: MediaRecord[] } | undefined)?.items ??
    []) as MediaRecord[]
  const childFoldersData = childFolders as { items: FolderItem[] } | undefined
  const folderOptions = useMemo(
    (): { _id: string | null; name: string; path: string }[] => [
      { _id: null, name: 'Base folder', path: '/' },
      ...[...(folders ?? [])].sort((a, b) => a.path.localeCompare(b.path)),
    ],
    [folders],
  )

  const { files, setFiles, isUploading, handleUpload, onFileReject } =
    useMediaUpload({
      onUpload,
      refetchMedia: refetch,
    })

  const { renderPreview } = useMediaPreviewRenderer({
    media,
    resolvePreviewUrl: async (item) => {
      if (item.previewUrl) return item.previewUrl
      if (item.url) return item.url
      const result = (await managerClient.request('manager.media.getUrl', {
        key: item.previewKey || item.key,
        access: item.access,
      })) as { url: string }
      return result.url
    },
  })

  const {
    expandedPreview,
    expandedPreviewUrl,
    setExpandedPreview,
    onMediaClick,
  } = useExpandedPreview({
    selectable,
    onSelect,
    resolveOriginalUrl: async (item) => {
      if (item.url) return item.url
      const result = (await managerClient.request('manager.media.getUrl', {
        key: item.key,
        access: item.access,
      })) as { url: string }
      return result.url
    },
  })

  useEffect(() => {
    if (!externalEditFolderRequest) return
    setEditTarget({
      contentType: 'MediaFolder',
      id: externalEditFolderRequest.id,
      name: externalEditFolderRequest.name,
    })
    setEditName(externalEditFolderRequest.name)
  }, [externalEditFolderRequest])

  useEffect(() => {
    if (!externalDeleteFolderRequest) return
    setDeleteTarget({
      contentType: 'MediaFolder',
      id: externalDeleteFolderRequest.id,
      name: externalDeleteFolderRequest.name,
      path: externalDeleteFolderRequest.path,
      parentId: externalDeleteFolderRequest.parentId,
    })
  }, [externalDeleteFolderRequest])

  const handleConfirmDelete = () => {
    if (!deleteTarget) return

    if (deleteTarget.contentType === 'MediaFolder') {
      deleteFolderMutation.mutate(
        {
          id: deleteTarget.id,
          recursive: true,
        },
        {
          onSuccess: async () => {
            await Promise.all([
              refetch(),
              refetchChildFolders(),
              refetchFoldersTree(),
            ])

            const currentFolder = currentFolderId
              ? folders?.find((folder) => folder._id === currentFolderId)
              : null
            const deletedPath = deleteTarget.path
            if (
              currentFolderId === deleteTarget.id ||
              (deletedPath &&
                currentFolder?.path.startsWith(`${deletedPath}/`))
            ) {
              setCurrentFolderId(deleteTarget.parentId ?? null)
            }

            setDeleteTarget(null)
            toast.success('Folder deleted successfully')
          },
        },
      )
      return
    }

    deleteMutation.mutate(
      {
        contentType: deleteTarget.contentType,
        id: deleteTarget.id,
      },
      {
        onSuccess: async () => {
          await Promise.all([
            refetch(),
            refetchChildFolders(),
            refetchFoldersTree(),
          ])
          setDeleteTarget(null)
          toast.success(
            `${deleteTarget.contentType === 'MediaFolder' ? 'Folder' : 'File'} deleted successfully`,
          )
        },
      },
    )
  }

  const handleEdit = (target: DeleteTarget) => {
    setEditTarget(target)
    setEditName(target.name)
  }

  const handleConfirmCreateFolder = async () => {
    const folderName = newFolderName.trim()
    if (!folderName) return

    try {
      setIsCreatingFolder(true)
      await onCreateFolder(currentFolderId, folderName)
      setIsCreateFolderDialogOpen(false)
      setNewFolderName('')
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const handleConfirmEdit = () => {
    if (!editTarget) return
    const nextName = editName.trim()

    if (!nextName || nextName === editTarget.name) {
      setEditTarget(null)
      return
    }

    updateMutation.mutate(
      {
        contentType: editTarget.contentType,
        id: editTarget.id,
        data: { name: nextName },
      },
      {
        onSuccess: async () => {
          await Promise.all([
            refetch(),
            refetchChildFolders(),
            refetchFoldersTree(),
          ])
          setEditTarget(null)
          toast.success(
            `${editTarget.contentType === 'MediaFolder' ? 'Folder' : 'File'} updated successfully`,
          )
        },
      },
    )
  }

  const handleConfirmMove = () => {
    if (!moveTarget || !destinationFolderId) return
    if (
      destinationFolderId === (moveTarget.currentFolderId ?? ROOT_FOLDER_VALUE)
    ) {
      setMoveTarget(null)
      return
    }

    const sourceFolderId = moveTarget.currentFolderId ?? null
    const targetFolderId =
      destinationFolderId === ROOT_FOLDER_VALUE ? null : destinationFolderId

    updateMutation.mutate(
      {
        contentType: 'Media',
        id: moveTarget.id,
        data:
          destinationFolderId === ROOT_FOLDER_VALUE
            ? { folder: null }
            : {
                folder: {
                  type: 'existing',
                  _id: destinationFolderId,
                  contentType: 'MediaFolder',
                },
              },
      },
      {
        onSuccess: async () => {
          await Promise.all([
            refetch(),
            ...(['all', 'image', 'video', 'document'] as const).flatMap(
              (mediaType) =>
                [sourceFolderId, targetFolderId].map((folderId) =>
                  queryClient.invalidateQueries({
                    queryKey: createManagerQueryKey('manager.list', {
                      contentType: 'Media',
                      query: {
                        filter: getMediaQueryFilter(folderId, mediaType),
                        options: {
                          limit: 'all',
                          sort: {
                            uploadedAt: 'desc',
                          },
                        },
                      },
                    }),
                  }),
                ),
            ),
          ])
          setMoveTarget(null)
          setDestinationFolderId('')
          toast.success('File moved successfully')
        },
      },
    )
  }

  const onRequestDelete = (item: MediaRecord | FolderItem) => {
    if (isMediaRecord(item)) {
      setDeleteTarget({
        contentType: 'Media',
        id: item._id,
        name: item.name,
      })
      return
    }

    setDeleteTarget({
      contentType: 'MediaFolder',
      id: item._id,
      name: item.name,
      path: item.path,
      parentId: item.parentId,
    })
  }

  const onRequestEdit = (item: MediaRecord | FolderItem) => {
    if (isMediaRecord(item)) {
      onMediaClick(item)
      return
    }

    handleEdit({
      contentType:
        '_type' in item && item._type === 'Media' ? 'Media' : 'MediaFolder',
      id: item._id,
      name: item.name,
    })
  }

  const handleSavePreviewDetails = async ({
    name,
    title,
    alt,
  }: {
    name: string
    title: string
    alt: string
  }) => {
    if (!expandedPreview) return

    try {
      await updateMutation.mutateAsync({
        contentType: 'Media',
        id: expandedPreview._id,
        data: {
          name: name || expandedPreview.name,
          title: title || null,
          alt: alt || null,
        },
      })

      setExpandedPreview({
        ...expandedPreview,
        name: name || expandedPreview.name,
        title: title || undefined,
        alt: alt || undefined,
      })
      await refetch()
      toast.success('Image details saved')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save image details',
      )
    }
  }

  const onRequestMove = (item: MediaRecord) => {
    setMoveTarget({
      id: item._id,
      name: item.name,
      currentFolderId: item.folder?._id,
    })
    setDestinationFolderId(item.folder?._id ?? ROOT_FOLDER_VALUE)
  }

  const ViewComponent =
    viewMode === 'list'
      ? PreviewsListView
      : viewMode === 'grid-sm'
        ? PreviewsGridSmallView
        : PreviewsGridLargeView

  const mediaPreviewContextValue = useMemo(
    () => ({
      mediaCount: media.length,
      isUploading,
      mediaTypeFilter: effectiveMediaTypeFilter,
      isMediaTypeFilterLocked,
      setMediaTypeFilter,
      viewMode,
      setViewMode,
      isSelected: (id: string) => selectedMediaIds?.has(id) ?? false,
      onMediaClick,
      onRequestEdit,
      onRequestMove,
      onRequestDelete,
      renderPreview,
      formatFileSize,
    }),
    [
      media.length,
      isUploading,
      effectiveMediaTypeFilter,
      isMediaTypeFilterLocked,
      viewMode,
      selectedMediaIds,
      onMediaClick,
      onRequestEdit,
      onRequestMove,
      onRequestDelete,
      renderPreview,
    ],
  )

  return (
    <ScrollArea className='h-[calc(100%-2.5rem)] w-full'>
      <MediaPreviewProvider value={mediaPreviewContextValue}>
        <div className='mb-2 grid w-full grid-cols-2 gap-2 p-1 lg:grid-cols-6'>
          <Button
            variant='outline'
            disabled={isCreatingFolder}
            size='lg'
            className='justify-start'
            onClick={() => {
              setIsCreateFolderDialogOpen(true)
            }}
          >
            <FolderPlus className='size-4' />
            <span className='truncate'>Create folder</span>
          </Button>
          {isLoadingChildFolders
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`child-folder-skeleton-${index}`}
                  className='flex items-center gap-2 rounded-lg border bg-card p-2'
                >
                  <Skeleton className='h-7 w-7 rounded-md' />
                  <Skeleton className='h-4 flex-1' />
                </div>
              ))
            : childFoldersData?.items?.length
              ? childFoldersData.items.map((folder) => (
                  <ContextMenu key={folder._id}>
                    <ContextMenuTrigger asChild>
                      <Button
                        type='button'
                        variant='outline'
                        size='lg'
                        className='justify-start data-[state=open]:bg-accent/60 data-[state=open]:ring-1 data-[state=open]:ring-primary/30'
                        onClick={() => setCurrentFolderId(folder._id)}
                      >
                        <Folder className='size-4' />
                        <span className='truncate'>{folder.name}</span>
                      </Button>
                    </ContextMenuTrigger>
                    <MediaContextMenuContent item={folder} />
                  </ContextMenu>
                ))
              : null}
        </div>

        <FileUpload
          value={files}
          onValueChange={setFiles}
          onUpload={handleUpload}
          onFileReject={onFileReject}
          maxFiles={5}
          className='relative w-full p-1'
          multiple
          disabled={isUploading}
        >
          <PreviewsToolbar />

          <FileUploadList className='mb-3'>
            {files.map((file) => (
              <FileUploadItem key={file.name + file.lastModified} value={file}>
                <FileUploadItemPreview />
                <div className='min-w-0 flex-1'>
                  <FileUploadItemMetadata />
                  <FileUploadItemProgress className='mt-2' />
                </div>
                <FileUploadItemDelete className='rounded-md p-1 hover:bg-accent/40'>
                  <X className='size-4' />
                </FileUploadItemDelete>
              </FileUploadItem>
            ))}
          </FileUploadList>

          <FileUploadDropzone
            asChild
            tabIndex={-1}
            onClick={(event) => event.preventDefault()}
            className='group/dropzone relative w-full rounded-xl border border-transparent p-0 hover:bg-transparent! focus-visible:bg-transparent! data-dragging:border-primary/40 data-dragging:bg-transparent!'
          >
            <div className='relative w-full'>
              <div className='pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/50 opacity-0 backdrop-blur transition-opacity duration-200 ease-out group-data-dragging/dropzone:opacity-100'>
                <div className='flex flex-col items-center gap-1 text-center'>
                  <div className='flex items-center justify-center rounded-full border p-2.5'>
                    <Upload className='size-6 text-muted-foreground' />
                  </div>
                  <p className='font-medium text-sm'>Drag & drop files here</p>
                  <p className='text-muted-foreground text-xs'>
                    Upload max 5 files each up to 5MB
                  </p>
                </div>
              </div>

              {isLoading ? <PreviewsViewLoader viewMode={viewMode} /> : null}

              {!isLoading && media.length === 0 ? (
                <Card className='w-full p-8 text-center text-muted-foreground text-sm'>
                  No files in this folder yet.
                </Card>
              ) : null}

              {!isLoading && media.length > 0 ? (
                <ViewComponent media={media} />
              ) : null}
            </div>
          </FileUploadDropzone>
        </FileUpload>

        <MediaDeleteDialog
          target={deleteTarget}
          isLoading={deleteMutation.isPending || deleteFolderMutation.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />

        <MediaEditDialog
          target={editTarget}
          value={editName}
          isLoading={updateMutation.isPending}
          onValueChange={setEditName}
          onClose={() => setEditTarget(null)}
          onConfirm={handleConfirmEdit}
        />

        <MediaMoveDialog
          target={moveTarget}
          folders={folderOptions}
          value={destinationFolderId}
          isLoading={updateMutation.isPending}
          onValueChange={setDestinationFolderId}
          onClose={() => {
            setMoveTarget(null)
            setDestinationFolderId('')
          }}
          onConfirm={handleConfirmMove}
        />

        <MediaCreateFolderDialog
          open={isCreateFolderDialogOpen}
          value={newFolderName}
          isLoading={isCreatingFolder}
          onValueChange={setNewFolderName}
          onClose={() => {
            setIsCreateFolderDialogOpen(false)
            setNewFolderName('')
          }}
          onConfirm={handleConfirmCreateFolder}
        />

        <ExpandedPreviewDialog
          preview={expandedPreview}
          previewUrl={expandedPreviewUrl}
          isSaving={updateMutation.isPending}
          onClose={() => setExpandedPreview(null)}
          onSaveDetails={handleSavePreviewDetails}
        />
      </MediaPreviewProvider>
    </ScrollArea>
  )
}
