'use client'

import {
  Check,
  Crop,
  FolderInput,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react'

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '../../ui/context-menu'
import { useMediaPreview } from './context/MediaPreviewContext'

import { useTranslations } from '@/i18n'
import type { MediaRecord } from '@/lib/media'
import type { FolderItem } from '@/components/media/contexts/MediaLibraryContext'

type MediaContextMenuContentProps = {
  item: MediaRecord | FolderItem
}

export default function MediaContextMenuContent({
  item,
}: MediaContextMenuContentProps) {
  const t = useTranslations()
  const {
    canBulkSelect,
    bulkSelectedIds,
    bulkSelectedCount,
    onRequestSelect,
    onRequestEdit,
    onRequestImageEdit,
    canReimportWithOptimization,
    isReimporting,
    onRequestReimport,
    onRequestBulkReimport,
    onRequestMove,
    onRequestDelete,
  } = useMediaPreview()
  const isMediaItem = '_type' in item && item._type === 'Media'
  const isImageItem = isMediaItem && item.mime.startsWith('image/')
  const selectedImageCount =
    isMediaItem && bulkSelectedIds.has(item._id)
      ? Math.max(bulkSelectedCount, 1)
      : 1
  const reimportSelected =
    isImageItem && selectedImageCount > 1 && bulkSelectedIds.has(item._id)

  return (
    <ContextMenuContent>
      {isMediaItem && canBulkSelect ? (
        <>
          <ContextMenuItem onSelect={() => onRequestSelect(item)}>
            <Check className='size-4' />
            {bulkSelectedIds.has(item._id)
              ? t('common.deselect')
              : t('common.select')}
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      ) : null}
      <ContextMenuItem onSelect={() => onRequestEdit?.(item)}>
        <Pencil className='size-4' />
        {t('common.edit')}
      </ContextMenuItem>
      {isImageItem ? (
        <>
          <ContextMenuItem onSelect={() => onRequestImageEdit(item)}>
            <Crop className='size-4' />
            {t('media.cropAndRotate')}
          </ContextMenuItem>
          <ContextMenuItem
            disabled={
              !canReimportWithOptimization ||
              (reimportSelected
                ? false
                : isReimporting(item._id))
            }
            onSelect={() => {
              if (reimportSelected) {
                onRequestBulkReimport()
                return
              }
              onRequestReimport(item)
            }}
          >
            {isReimporting(item._id) ? (
              <LoaderCircle className='size-4 animate-spin' />
            ) : (
              <RefreshCw className='size-4' />
            )}
            {!canReimportWithOptimization
              ? t('media.enableOptimizationToReimport')
              : t('media.reimportConfirm')}
          </ContextMenuItem>
        </>
      ) : null}
      {isMediaItem ? (
        <>
          <ContextMenuItem onSelect={() => onRequestMove(item)}>
            <FolderInput className='size-4' />
            {t('media.moveToFolder')}
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      ) : null}
      <ContextMenuItem
        variant='destructive'
        onSelect={() => onRequestDelete?.(item)}
      >
        <Trash2 className='size-4' />
        {t('common.delete')}
      </ContextMenuItem>
    </ContextMenuContent>
  )
}
