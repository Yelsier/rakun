'use client'

import {
  Check,
  Crop,
  Download,
  FolderInput,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '../../ui/context-menu'
import { useMediaPreview } from './context/MediaPreviewContext'
import {
  getMediaDownloadAssets,
  getMediaDownloadFileName,
  type MediaDownloadAsset,
} from './utils/mediaDownload'

import { useManagerClient } from '@/client/react'
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
  const managerClient = useManagerClient()
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
    formatFileSize,
  } = useMediaPreview()
  const isMediaItem = '_type' in item && item._type === 'Media'
  const isImageItem = isMediaItem && item.mime.startsWith('image/')
  const isOptimizableItem =
    isMediaItem &&
    (item.mime.startsWith('image/') || item.mime.startsWith('video/'))
  const selectedOptimizableCount =
    isMediaItem && bulkSelectedIds.has(item._id)
      ? Math.max(bulkSelectedCount, 1)
      : 1
  const reimportSelected =
    isOptimizableItem &&
    selectedOptimizableCount > 1 &&
    bulkSelectedIds.has(item._id)
  const downloadAssets = isMediaItem ? getMediaDownloadAssets(item) : []

  const startDownload = (url: string, fileName: string, openInNewTab = false) => {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.rel = 'noopener'
    if (openInNewTab) anchor.target = '_blank'
    anchor.style.display = 'none'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
  }

  const downloadAsset = async (asset: MediaDownloadAsset) => {
    if (!isMediaItem) return

    try {
      const resolvedUrl =
        item.access === 'public' && asset.url
          ? asset.url
          : (
              (await managerClient.request('manager.media.getUrl', {
                key: asset.key,
                access: item.access,
              })) as { url: string }
            ).url
      const fileName = getMediaDownloadFileName(item, asset)
      let response: Response

      try {
        response = await fetch(resolvedUrl)
      } catch (_) {
        startDownload(resolvedUrl, fileName, true)
        return
      }

      if (!response.ok) throw new Error(`Download failed with status ${response.status}`)

      const objectUrl = URL.createObjectURL(await response.blob())
      startDownload(objectUrl, fileName)
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (_) {
      toast.error(t('media.downloadError'))
    }
  }

  const formatDownloadAsset = (asset: MediaDownloadAsset) => {
    const format = asset.mime.split('/').pop()?.toUpperCase() || asset.mime
    const dimensions =
      asset.width && asset.height ? `${asset.width}×${asset.height}` : undefined

    return [format, dimensions, formatFileSize(asset.size)].filter(Boolean).join(' · ')
  }

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
        </>
      ) : null}
      {downloadAssets.length > 1 ? (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Download className='size-4' />
            {t('common.download')}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {downloadAssets.map((asset) => (
              <ContextMenuItem
                key={asset.key || asset.url}
                onSelect={() => void downloadAsset(asset)}
              >
                <Download className='size-4' />
                {formatDownloadAsset(asset)}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      ) : downloadAssets[0] ? (
        <ContextMenuItem onSelect={() => void downloadAsset(downloadAssets[0]!)}>
          <Download className='size-4' />
          {t('common.download')}
        </ContextMenuItem>
      ) : null}
      {isOptimizableItem ? (
        <ContextMenuItem
          disabled={
            !canReimportWithOptimization ||
            (reimportSelected ? false : isReimporting(item._id))
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
