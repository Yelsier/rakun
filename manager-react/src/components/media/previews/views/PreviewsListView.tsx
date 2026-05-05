'use client'

import { Check } from 'lucide-react'

import { ContextMenu, ContextMenuTrigger } from '../../../ui/context-menu'
import MediaContextMenuContent from '../MediaContextMenuContent'
import { useMediaPreview } from '../context/MediaPreviewContext'

import type { MediaRecord } from '@/lib/media'

type PreviewsListViewProps = {
  media: MediaRecord[]
}

export default function PreviewsListView({ media }: PreviewsListViewProps) {
  const { onMediaClick, renderPreview, formatFileSize, isSelected } =
    useMediaPreview()

  return (
    <div className='relative w-full overflow-hidden rounded-lg border'>
      <div className='grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 border-b bg-muted/40 px-3 py-2 text-muted-foreground text-xs md:grid-cols-[56px_minmax(0,1fr)_minmax(0,180px)] xl:grid-cols-[56px_minmax(0,1fr)_minmax(0,180px)_110px]'>
        <span>Preview</span>
        <span>Name</span>
        <span className='hidden md:block'>Type / Size</span>
        <span className='hidden xl:block'>Date</span>
      </div>
      {media.map((item) => (
        <ContextMenu key={item._id}>
          <ContextMenuTrigger asChild>
            <button
              type='button'
              className='grid w-full grid-cols-[56px_minmax(0,1fr)] items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-accent/40 data-[state=open]:bg-accent/60 data-[state=open]:ring-1 data-[state=open]:ring-primary/30 md:grid-cols-[56px_minmax(0,1fr)_minmax(0,180px)] xl:grid-cols-[56px_minmax(0,1fr)_minmax(0,180px)_110px]'
              onClick={() => onMediaClick(item)}
            >
              <div className='h-12 w-12 overflow-hidden rounded-md border bg-muted'>
                {renderPreview(item)}
              </div>
              <div className='min-w-0'>
                <p className='truncate font-medium text-sm'>
                  {isSelected(item._id) ? (
                    <span className='mr-2 inline-flex rounded-full bg-primary p-0.5 text-primary-foreground align-middle'>
                      <Check className='size-3' />
                    </span>
                  ) : null}
                  {item.name}
                </p>
              </div>
              <p className='hidden truncate text-muted-foreground text-xs md:block'>
                {item.mime} • {formatFileSize(item.size)}
              </p>
              <p className='hidden text-muted-foreground text-xs tabular-nums xl:block'>
                {new Date(item.uploadedAt).toLocaleDateString()}
              </p>
            </button>
          </ContextMenuTrigger>
          <MediaContextMenuContent item={item} />
        </ContextMenu>
      ))}
    </div>
  )
}
