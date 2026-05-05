'use client'

import { FolderInput, Pencil, Trash2 } from 'lucide-react'

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
  const { onRequestEdit, onRequestMove, onRequestDelete } = useMediaPreview()
  const isMediaItem = '_type' in item && item._type === 'Media'

  return (
    <ContextMenuContent>
      <ContextMenuItem onSelect={() => onRequestEdit?.(item)}>
        <Pencil className='size-4' />
        Edit
      </ContextMenuItem>
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
