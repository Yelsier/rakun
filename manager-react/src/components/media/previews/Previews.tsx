'use client'

import { Folder, FolderPlus, Upload, X } from 'lucide-react'
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
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
import { Skeleton } from '../../ui/skeleton'
import { useMediaLibrary } from '../contexts/MediaLibraryContext'
import MediaContextMenuContent from './MediaContextMenuContent'
import { MediaPreviewProvider } from './context/MediaPreviewContext'
import ExpandedPreviewDialog from './dialogs/ExpandedPreviewDialog'
import MediaCreateFolderDialog from './dialogs/MediaCreateFolderDialog'
import MediaDeleteDialog from './dialogs/MediaDeleteDialog'
import MediaEditDialog from './dialogs/MediaEditDialog'
import MediaImageEditorDialog from './dialogs/MediaImageEditorDialog'
import MediaMoveDialog from './dialogs/MediaMoveDialog'
import { useExpandedPreview } from './hooks/useExpandedPreview'
import { useMediaPreviewRenderer } from './hooks/useMediaPreviewRenderer'
import { useMediaUpload } from './hooks/useMediaUpload'
import PreviewsToolbar, { PreviewsSelectionToolbar } from './toolbar/PreviewsToolbar'
import { formatFileSize } from './utils/mediaPreview'
import PreviewsGridLargeView from './views/PreviewsGridLargeView'
import PreviewsGridSmallView from './views/PreviewsGridSmallView'
import PreviewsListView from './views/PreviewsListView'
import PreviewsViewLoader from './views/PreviewsViewLoader'

import type { MediaRecord } from '@/lib/media'
import type { FolderItem } from '@/components/media/contexts/MediaLibraryContext'
import { useTranslations } from '@/i18n'
import { useMedia } from '@/media'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'

type ViewMode = 'list' | 'grid-sm' | 'grid-lg'
type DeleteTarget = {
  contentType: 'Media' | 'MediaFolder'
  id: string
  name: string
  path?: string
  parentId?: string
}

type MoveTarget = {
  id?: string
  ids?: string[]
  name: string
  currentFolderId?: string
}

const ROOT_FOLDER_VALUE = '__root__'

const isMediaRecord = (item: MediaRecord | FolderItem): item is MediaRecord =>
  '_type' in item && item._type === 'Media'

export default function Previews() {
  const t = useTranslations()
  const managerClient = useManagerClient()
  const queryClient = useQueryClient()
  const { uploadMedia } = useMedia()
  const {
    currentFolderId,
    currentFolderPath,
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
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video' | 'document'>(
    'all'
  )
  const [searchTerm, setSearchTerm] = useState('')
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const trimmedSearch = deferredSearchTerm.trim()
  const effectiveMediaTypeFilter = forcedMediaTypeFilter ?? mediaTypeFilter
  const isMediaTypeFilterLocked = !!forcedMediaTypeFilter && forcedMediaTypeFilter !== 'all'

  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [editTarget, setEditTarget] = useState<DeleteTarget | null>(null)
  const [editName, setEditName] = useState('')
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null)
  const [imageEditTarget, setImageEditTarget] = useState<MediaRecord | null>(null)
  const [imageEditUrl, setImageEditUrl] = useState('')
  const [isSavingImageEdit, setIsSavingImageEdit] = useState(false)
  const [destinationFolderId, setDestinationFolderId] = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isMoving, setIsMoving] = useState(false)

  const getMediaQueryFilter = (
    folderId: string | null,
    mediaType: 'all' | 'image' | 'video' | 'document',
    search: string
  ) => {
    const folderFilter = folderId ? { 'folder._id': folderId } : { folder: { $exists: false } }

    let typeAndFolderFilter: Record<string, unknown>
    switch (mediaType) {
      case 'image':
        typeAndFolderFilter = { ...folderFilter, mime: { $contains: 'image/' } }
        break
      case 'video':
        typeAndFolderFilter = { ...folderFilter, mime: { $contains: 'video/' } }
        break
      case 'document':
        typeAndFolderFilter = {
          ...folderFilter,
          $or: [{ mime: { $contains: 'application/' } }, { mime: { $contains: 'text/' } }],
        }
        break
      default:
        typeAndFolderFilter = folderFilter
    }

    if (!search) return typeAndFolderFilter

    return {
      $and: [
        typeAndFolderFilter,
        {
          $or: [
            { name: { $contains: search } },
            { title: { $contains: search } },
            { originalName: { $contains: search } },
            { alt: { $contains: search } },
          ],
        },
      ],
    }
  }

  const mediaListInput = {
    contentType: 'Media' as const,
    query: {
      filter: getMediaQueryFilter(
        currentFolderId,
        effectiveMediaTypeFilter,
        trimmedSearch
      ),
      options: {
        limit: 'all' as const,
        sort: {
          uploadedAt: 'desc' as const,
        },
      },
    },
  }

  const { data, isPending, refetch, isPlaceholderData } = useManagerQuery({
    name: 'manager.list',
    input: mediaListInput,
    placeholderData: keepPreviousData,
  })

  const {
    data: childFolders,
    isPending: isPendingChildFolders,
    refetch: refetchChildFolders,
    isPlaceholderData: isPlaceholderChildFolders,
  } = useManagerQuery({
    name: 'manager.media.listFolders',
    input: currentFolderId ? { parentId: currentFolderId } : {},
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useManagerMutation('manager.delete')
  const deleteFolderMutation = useManagerMutation('manager.media.deleteFolder')
  const updateMutation = useManagerMutation('manager.update')

  const media = ((data as { items?: MediaRecord[] } | undefined)?.items ?? []) as MediaRecord[]
  const childFoldersData = childFolders as { items: FolderItem[] } | undefined
  const showMediaSkeleton = isPending && !isPlaceholderData
  const showChildFoldersSkeleton = isPendingChildFolders && !isPlaceholderChildFolders
  const canBulkSelect = !selectable
  const bulkSelectedIdsList = useMemo(() => Array.from(bulkSelectedIds), [bulkSelectedIds])
  const bulkSelectedCount = bulkSelectedIdsList.length
  const folderOptions = useMemo(
    (): { _id: string | null; name: string; path: string }[] => [
      { _id: null, name: 'Base folder', path: '/' },
      ...[...(folders ?? [])].sort((a, b) => a.path.localeCompare(b.path)),
    ],
    [folders]
  )

  const { files, setFiles, isUploading, handleUpload, onFileReject } = useMediaUpload({
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

  const { expandedPreview, expandedPreviewUrl, setExpandedPreview, onMediaClick } =
    useExpandedPreview({
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
    setSelectionMode(false)
    setBulkSelectedIds(new Set())
  }, [currentFolderId, effectiveMediaTypeFilter, trimmedSearch])

  useEffect(() => {
    setBulkSelectedIds((prev) => {
      if (prev.size === 0) return prev

      const visibleIds = new Set(media.map((item) => item._id))
      const next = new Set([...prev].filter((id) => visibleIds.has(id)))

      return next.size === prev.size ? prev : next
    })
  }, [media])

  useEffect(() => {
    if (selectionMode && bulkSelectedCount === 0) {
      setSelectionMode(false)
    }
  }, [selectionMode, bulkSelectedCount])

  const clearBulkSelection = () => {
    setSelectionMode(false)
    setBulkSelectedIds(new Set())
  }

  const toggleBulkSelection = (item: MediaRecord) => {
    if (canBulkSelect) {
      setSelectionMode(true)
    }

    setBulkSelectedIds((prev) => {
      const next = new Set(prev)

      if (next.has(item._id)) {
        next.delete(item._id)
      } else {
        next.add(item._id)
      }

      return next
    })
  }

  const selectVisible = (items: MediaRecord[], selected: boolean) => {
    if (canBulkSelect) {
      setSelectionMode(true)
    }

    setBulkSelectedIds((prev) => {
      const next = new Set(prev)

      for (const item of items) {
        if (selected) {
          next.add(item._id)
        } else {
          next.delete(item._id)
        }
      }

      return next
    })
  }

  const handleMediaClick = (item: MediaRecord) => {
    if (canBulkSelect && selectionMode) {
      toggleBulkSelection(item)
      return
    }

    onMediaClick(item)
  }

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
            await Promise.all([refetch(), refetchChildFolders(), refetchFoldersTree()])

            const currentFolder = currentFolderId
              ? folders?.find((folder) => folder._id === currentFolderId)
              : null
            const deletedPath = deleteTarget.path
            if (
              currentFolderId === deleteTarget.id ||
              (deletedPath && currentFolder?.path.startsWith(`${deletedPath}/`))
            ) {
              setCurrentFolderId(deleteTarget.parentId ?? null)
            }

            setDeleteTarget(null)
            toast.success(t('media.folderDeleted'))
          },
        }
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
          await Promise.all([refetch(), refetchChildFolders(), refetchFoldersTree()])
          setDeleteTarget(null)
          toast.success(
            deleteTarget.contentType === 'MediaFolder'
              ? t('media.folderDeleted')
              : t('media.fileDeleted'),
          )
        },
      }
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
          await Promise.all([refetch(), refetchChildFolders(), refetchFoldersTree()])
          setEditTarget(null)
          toast.success(
            editTarget.contentType === 'MediaFolder'
              ? t('media.folderUpdated')
              : t('media.fileUpdated'),
          )
        },
      }
    )
  }

  const invalidateMediaLists = async (
    sourceFolderId: string | null,
    targetFolderId: string | null
  ) => {
    await Promise.all(
      (['all', 'image', 'video', 'document'] as const).flatMap((mediaType) =>
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
          })
        )
      )
    )
  }

  const handleConfirmMove = async () => {
    if (!moveTarget || !destinationFolderId) return
    if (destinationFolderId === (moveTarget.currentFolderId ?? ROOT_FOLDER_VALUE)) {
      setMoveTarget(null)
      return
    }

    const sourceFolderId = moveTarget.currentFolderId ?? null
    const targetFolderId = destinationFolderId === ROOT_FOLDER_VALUE ? null : destinationFolderId
    const ids = moveTarget.ids ?? (moveTarget.id ? [moveTarget.id] : [])

    if (ids.length === 0) return

    setIsMoving(true)
    let successCount = 0
    let failedCount = 0
    let lastError: unknown

    for (const id of ids) {
      try {
        await updateMutation.mutateAsync({
          contentType: 'Media',
          id,
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
        })
        successCount += 1
      } catch (error) {
        failedCount += 1
        lastError = error
      }
    }

    if (successCount > 0) {
      await Promise.all([refetch(), invalidateMediaLists(sourceFolderId, targetFolderId)])
      setMoveTarget(null)
      setDestinationFolderId('')
      clearBulkSelection()
      toast.success(t('media.filesMoved', { count: successCount }))
    }

    if (failedCount > 0) {
      toast.error(
        t('media.filesFailed', {
          count: failedCount,
          reason: getActionErrorMessage(lastError),
        }),
      )
    }

    setIsMoving(false)
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
      contentType: '_type' in item && item._type === 'Media' ? 'Media' : 'MediaFolder',
      id: item._id,
      name: item.name,
    })
  }

  const onRequestImageEdit = async (item: MediaRecord) => {
    if (!item.mime.startsWith('image/')) return

    try {
      const url = item.url
        ? item.url
        : (
            (await managerClient.request('manager.media.getUrl', {
              key: item.key,
              access: item.access,
            })) as { url: string }
          ).url
      setImageEditTarget(item)
      setImageEditUrl(url)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('media.openImageEditorError'),
      )
    }
  }

  const handleSaveImageEdit = async (file: File) => {
    if (!imageEditTarget) return

    try {
      setIsSavingImageEdit(true)
      await uploadMedia({
        file,
        folderId: currentFolderId || undefined,
        folderPath: currentFolderPath,
        name: file.name,
        access: imageEditTarget.access,
      })
      await refetch()
      setImageEditTarget(null)
      setImageEditUrl('')
      toast.success(t('media.editedImageSaved'))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('media.saveEditedImageError'),
      )
    } finally {
      setIsSavingImageEdit(false)
    }
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
      toast.success(t('media.imageDetailsSaved'))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('media.saveImageDetailsError'),
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

  const onRequestSelect = (item: MediaRecord) => {
    if (!canBulkSelect) return

    setSelectionMode(true)
    toggleBulkSelection(item)
  }

  const onRequestBulkMove = () => {
    if (bulkSelectedIdsList.length === 0) return

    setMoveTarget({
      ids: bulkSelectedIdsList,
      name: `${bulkSelectedIdsList.length} selected files`,
      currentFolderId: currentFolderId ?? undefined,
    })
    setDestinationFolderId(currentFolderId ?? ROOT_FOLDER_VALUE)
  }

  const handleConfirmBulkDelete = async () => {
    if (bulkSelectedIdsList.length === 0) return

    setIsBulkDeleting(true)
    let successCount = 0
    let failedCount = 0
    let lastError: unknown

    for (const id of bulkSelectedIdsList) {
      try {
        await deleteMutation.mutateAsync({
          contentType: 'Media',
          id,
        })
        successCount += 1
      } catch (error) {
        failedCount += 1
        lastError = error
      }
    }

    if (successCount > 0) {
      await Promise.all([refetch(), refetchChildFolders(), refetchFoldersTree()])
      setBulkDeleteOpen(false)
      clearBulkSelection()
      toast.success(t('media.filesDeletedCount', { count: successCount }))
    }

    if (failedCount > 0) {
      toast.error(
        t('media.filesFailed', {
          count: failedCount,
          reason: getActionErrorMessage(lastError),
        }),
      )
    }

    setIsBulkDeleting(false)
  }

  const ViewComponent =
    viewMode === 'list'
      ? PreviewsListView
      : viewMode === 'grid-sm'
        ? PreviewsGridSmallView
        : PreviewsGridLargeView

  const handleMediaTypeFilterChange = useCallback(
    (value: 'all' | 'image' | 'video' | 'document') => {
      startTransition(() => {
        setMediaTypeFilter(value)
      })
    },
    []
  )

  const handleViewModeChange = useCallback((value: ViewMode) => {
    startTransition(() => {
      setViewMode(value)
    })
  }, [])

  const mediaPreviewContextValue = useMemo(
    () => ({
      mediaCount: media.length,
      isUploading,
      mediaTypeFilter: effectiveMediaTypeFilter,
      isMediaTypeFilterLocked,
      setMediaTypeFilter: handleMediaTypeFilterChange,
      searchTerm,
      setSearchTerm,
      viewMode,
      setViewMode: handleViewModeChange,
      isSelected: (id: string) => bulkSelectedIds.has(id) || (selectedMediaIds?.has(id) ?? false),
      selectionMode,
      bulkSelectedIds,
      bulkSelectedCount,
      canBulkSelect,
      onMediaClick: handleMediaClick,
      onToggleBulkSelection: toggleBulkSelection,
      onSelectVisible: selectVisible,
      onRequestSelect,
      onRequestBulkDelete: () => setBulkDeleteOpen(true),
      onRequestBulkMove,
      onClearSelection: clearBulkSelection,
      onRequestEdit,
      onRequestImageEdit,
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
      handleMediaTypeFilterChange,
      searchTerm,
      viewMode,
      handleViewModeChange,
      selectionMode,
      bulkSelectedIds,
      bulkSelectedCount,
      canBulkSelect,
      selectedMediaIds,
      handleMediaClick,
      toggleBulkSelection,
      selectVisible,
      onRequestSelect,
      onRequestBulkMove,
      clearBulkSelection,
      onRequestEdit,
      onRequestImageEdit,
      onRequestMove,
      onRequestDelete,
      renderPreview,
    ]
  )

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <MediaPreviewProvider value={mediaPreviewContextValue}>
        <div
          className="mb-2 flex w-full shrink-0 flex-wrap gap-2 p-1"
          data-tour="media-folders"
        >
          <Button
            variant="outline"
            disabled={isCreatingFolder}
            size="lg"
            className="justify-start"
            onClick={() => {
              setIsCreateFolderDialogOpen(true)
            }}
          >
            <FolderPlus className="size-4" />
            <span className="truncate">{t('media.createFolder')}</span>
          </Button>
          {showChildFoldersSkeleton
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`child-folder-skeleton-${index}`}
                  className="flex items-center gap-2 rounded-lg border bg-card p-2"
                >
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))
            : childFoldersData?.items?.length
              ? childFoldersData.items.map((folder) => (
                  <ContextMenu key={folder._id}>
                    <ContextMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="justify-start data-[state=open]:bg-accent/60 data-[state=open]:ring-1 data-[state=open]:ring-primary/30"
                        onClick={() => setCurrentFolderId(folder._id)}
                      >
                        <Folder className="size-4" />
                        <span className="truncate">{folder.name}</span>
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
          maxFiles={20}
          className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden p-1"
          multiple
          disabled={isUploading}
        >
          <div className="shrink-0 space-y-3">
            <PreviewsToolbar />

            <FileUploadList>
              {files.map((file) => (
                <FileUploadItem key={file.name + file.lastModified} value={file}>
                  <FileUploadItemPreview />
                  <div className="min-w-0 flex-1">
                    <FileUploadItemMetadata />
                    <FileUploadItemProgress className="mt-2" />
                  </div>
                  <FileUploadItemDelete className="rounded-md p-1 hover:bg-accent/40">
                    <X className="size-4" />
                  </FileUploadItemDelete>
                </FileUploadItem>
              ))}
            </FileUploadList>
          </div>

          <FileUploadDropzone
            asChild
            tabIndex={-1}
            onClick={(event) => event.preventDefault()}
            className="group/dropzone relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-transparent p-0 hover:bg-transparent! focus-visible:bg-transparent! data-dragging:border-primary/40 data-dragging:bg-transparent!"
          >
            <div
              className="relative min-h-0 w-full overflow-x-hidden overflow-y-auto"
              data-tour="media-grid"
            >
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/50 opacity-0 backdrop-blur transition-opacity duration-200 ease-out group-data-dragging/dropzone:opacity-100">
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="flex items-center justify-center rounded-full border p-2.5">
                    <Upload className="size-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm">{t('media.dragDropFiles')}</p>
                  <p className="text-muted-foreground text-xs">
                    {t('media.uploadLimits')}
                  </p>
                </div>
              </div>

              {showMediaSkeleton ? <PreviewsViewLoader viewMode={viewMode} /> : null}

              {!showMediaSkeleton && media.length === 0 ? (
                <Card className="w-full p-8 text-center text-muted-foreground text-sm">
                  {trimmedSearch
                    ? t('media.noSearchResults')
                    : t('media.emptyFolder')}
                </Card>
              ) : null}

              {!showMediaSkeleton && media.length > 0 ? <ViewComponent media={media} /> : null}
              <PreviewsSelectionToolbar />
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
          isLoading={isMoving || updateMutation.isPending}
          onValueChange={setDestinationFolderId}
          onClose={() => {
            setMoveTarget(null)
            setDestinationFolderId('')
          }}
          onConfirm={() => void handleConfirmMove()}
        />

        <MediaImageEditorDialog
          target={imageEditTarget}
          imageUrl={imageEditUrl}
          isSaving={isSavingImageEdit}
          onClose={() => {
            setImageEditTarget(null)
            setImageEditUrl('')
          }}
          onSave={handleSaveImageEdit}
        />

        <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('media.bulkDeleteTitle')}</DialogTitle>
              <DialogDescription>
                {t('media.bulkDeleteDescription', { count: bulkSelectedCount })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setBulkDeleteOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                loading={isBulkDeleting}
                disabled={bulkSelectedCount === 0}
                onClick={() => void handleConfirmBulkDelete()}
              >
                {t('common.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
    </div>
  )
}
