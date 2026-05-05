'use client'

import { ExternalLink } from 'lucide-react'

import { Button } from '../../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog'
import { ScrollArea } from '../../../ui/scroll-area'
import { Skeleton } from '../../../ui/skeleton'
import { FileTypeIcon, formatFileSize, formatPercent, isImage, isVideo } from '../utils/mediaPreview'

import type { MediaRecord } from '@/lib/media'

type ExpandedPreviewDialogProps = {
  preview: MediaRecord | null
  previewUrl: string
  onClose: () => void
}

export default function ExpandedPreviewDialog({
  preview,
  previewUrl,
  onClose,
}: ExpandedPreviewDialogProps) {
  return (
    <Dialog
      open={!!preview}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className='max-w-[95vw] p-4 sm:max-w-5xl'>
        <DialogHeader>
          <DialogTitle className='truncate'>{preview?.name || 'Preview'}</DialogTitle>
          <DialogDescription className='truncate'>
            {preview ? `${preview.mime} • ${formatFileSize(preview.size)}` : ''}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className='max-h-[85vh] pr-4'>
          <div className='flex h-[65vh] items-center justify-center overflow-hidden rounded-md border bg-muted/30'>
            {!preview || !previewUrl ? (
              <Skeleton className='h-full w-full' />
            ) : isImage(preview.mime) ? (
              <img
                src={previewUrl}
                alt={preview.name}
                className='h-full w-full object-contain'
              />
            ) : isVideo(preview.mime) ? (
              <video src={previewUrl} controls className='h-full w-full object-contain' />
            ) : (
              <div className='flex flex-col items-center gap-3 p-6 text-center'>
                <div className='rounded-full border p-3 text-muted-foreground'>
                  <FileTypeIcon mime={preview.mime} />
                </div>
                <p className='text-muted-foreground text-sm'>
                  This file type does not have inline preview.
                </p>
                <Button asChild variant='outline'>
                  <a href={previewUrl} target='_blank' rel='noreferrer'>
                    <ExternalLink className='size-4' />
                    Open file
                  </a>
                </Button>
              </div>
            )}
          </div>

          {preview ? (
            <div className='mt-3 grid grid-cols-1 gap-2 rounded-md border p-3 text-sm sm:grid-cols-2 lg:grid-cols-3'>
              <div>
                <p className='text-muted-foreground text-xs'>MIME</p>
                <p className='font-medium'>{preview.mime}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs'>Size</p>
                <p className='font-medium'>{formatFileSize(preview.size)}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs'>Original Size</p>
                <p className='font-medium'>
                  {preview.originalSize != null
                    ? formatFileSize(preview.originalSize)
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs'>Dimensions</p>
                <p className='font-medium'>
                  {preview.width && preview.height
                    ? `${preview.width}x${preview.height}`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs'>Orientation</p>
                <p className='font-medium'>{preview.orientation || 'N/A'}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs'>Optimization</p>
                <p className='font-medium'>
                  {preview.optimized
                    ? `Yes${preview.optimizedFormat ? ` (${preview.optimizedFormat})` : ''}`
                    : 'No'}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs'>Quality</p>
                <p className='font-medium'>
                  {preview.optimizationQuality != null
                    ? preview.optimizationQuality
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs'>Preview Variant</p>
                <p className='font-medium'>
                  {preview.previewUrl || preview.previewKey ? 'Available' : 'No'}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs'>Saved</p>
                <p className='font-medium'>
                  {preview.originalSize && preview.originalSize > preview.size
                    ? `${formatFileSize(preview.originalSize - preview.size)} (${formatPercent(((preview.originalSize - preview.size) / preview.originalSize) * 100)})`
                    : 'N/A'}
                </p>
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
