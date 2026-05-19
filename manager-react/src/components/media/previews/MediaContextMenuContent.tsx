'use client'

import { Check, Crop, FolderInput, Pencil, Trash2 } from 'lucide-react'

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '../../ui/context-menu'
import { useMediaPreview } from './context/MediaPreviewContext'

import type { MediaRecord } from '@/lib/media'
import type { FolderItem } from '@/components/media/contexts/MediaLibraryContext'

type MediaContextMenuContentProps = {
  item: MediaRecord | FolderItem
}

export default function MediaContextMenuContent({
  item,
}: MediaContextMenuContentProps) {
  const {
    canBulkSelect,
    bulkSelectedIds,
    onRequestSelect,
    onRequestEdit,
    onRequestImageEdit,
    onRequestMove,
    onRequestDelete,
  } = useMediaPreview()
  const isMediaItem = '_type' in item && item._type === 'Media'
  const isImageItem = isMediaItem && item.mime.startsWith('image/')

  return (
    <ContextMenuContent>
      {isMediaItem && canBulkSelect ? (
        <>
          <ContextMenuItem onSelect={() => onRequestSelect(item)}>
            <Check className='size-4' />
            {bulkSelectedIds.has(item._id) ? 'Deselect' : 'Select'}
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      ) : null}
      <ContextMenuItem onSelect={() => onRequestEdit?.(item)}>
        <Pencil className='size-4' />
        Edit
      </ContextMenuItem>
      {isImageItem ? (
        <ContextMenuItem onSelect={() => onRequestImageEdit(item)}>
          <Crop className='size-4' />
          Crop and rotate
        </ContextMenuItem>
      ) : null}
      {isMediaItem ? (
        <>
          <ContextMenuItem onSelect={() => onRequestMove(item)}>
            <FolderInput className='size-4' />
            Move to folder
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      ) : null}
      <ContextMenuItem
        variant='destructive'
        onSelect={() => onRequestDelete?.(item)}
      >
        <Trash2 className='size-4' />
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  )
}
