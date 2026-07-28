'use client'

import { Check } from 'lucide-react'

import { Card } from '../../../ui/card'
import { ContextMenu, ContextMenuTrigger } from '../../../ui/context-menu'
import MediaContextMenuContent from '../MediaContextMenuContent'
import { useMediaPreview } from '../context/MediaPreviewContext'

import type { MediaRecord } from '@/lib/media'

type PreviewsGridSmallViewProps = {
  media: MediaRecord[]
}

export default function PreviewsGridSmallView({ media }: PreviewsGridSmallViewProps) {
  const { onMediaClick, renderPreview, formatFileSize, isSelected } = useMediaPreview()

  return (
    <div className="relative grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {media.map((item) => (
        <ContextMenu key={item._id}>
          <ContextMenuTrigger asChild>
            <Card
              className="relative contain-paint md:overflow-hidden cursor-pointer p-2 hover:bg-accent/40 data-[state=open]:bg-accent/60 data-[state=open]:ring-1 data-[state=open]:ring-primary/30 [content-visibility:auto] [contain-intrinsic-size:auto_11rem]"
              onClick={() => onMediaClick(item)}
            >
              {isSelected(item._id) ? (
                <div className="absolute right-3 top-3 z-10 rounded-full bg-primary p-1 text-primary-foreground">
                  <Check className="size-3" />
                </div>
              ) : null}
              <div className="h-28 w-full overflow-hidden rounded-md border bg-muted">
                {renderPreview(item)}
              </div>
              <div className="p-2 pt-0">
                <p className="truncate font-medium text-sm">{item.name}</p>
                <p className="truncate text-muted-foreground text-xs">
                  {formatFileSize(item.size)} • {item.mime}
                </p>
              </div>
            </Card>
          </ContextMenuTrigger>
          <MediaContextMenuContent item={item} />
        </ContextMenu>
      ))}
    </div>
  )
}
