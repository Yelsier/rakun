'use client'

import { Check } from 'lucide-react'

import { Card } from '../../../ui/card'
import { ContextMenu, ContextMenuTrigger } from '../../../ui/context-menu'
import MediaContextMenuContent from '../MediaContextMenuContent'
import { useMediaPreview } from '../context/MediaPreviewContext'

import type { MediaRecord } from '@/lib/media'

type PreviewsGridLargeViewProps = {
  media: MediaRecord[]
}

export default function PreviewsGridLargeView({ media }: PreviewsGridLargeViewProps) {
  const { onMediaClick, renderPreview, formatFileSize, isSelected } = useMediaPreview()

  return (
    <div className="relative grid w-full grid-cols-1 gap-3 lg:grid-cols-2">
      {media.map((item) => (
        <ContextMenu key={item._id}>
          <ContextMenuTrigger asChild>
            <Card
              className="relative overflow-hidden cursor-pointer p-3 hover:bg-accent/40 data-[state=open]:bg-accent/60 data-[state=open]:ring-1 data-[state=open]:ring-primary/30"
              onClick={() => onMediaClick(item)}
            >
              {isSelected(item._id) ? (
                <div className="absolute right-4 top-4 z-10 rounded-full bg-primary p-1 text-primary-foreground">
                  <Check className="size-3" />
                </div>
              ) : null}
              <div className="h-52 w-full overflow-hidden rounded-md border bg-muted">
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
