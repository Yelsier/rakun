'use client'

import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Image as RakunImage } from '@rakun-kit/react'

import { Button } from '../../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { ScrollArea } from '../../../ui/scroll-area'
import { Skeleton } from '../../../ui/skeleton'
import {
  FileTypeIcon,
  formatFileSize,
  formatPercent,
  isImage,
  isVideo,
} from '../utils/mediaPreview'

import { useTranslations } from '@/i18n'
import type { MediaRecord } from '@/lib/media'

type ExpandedPreviewDialogProps = {
  preview: MediaRecord | null
  previewUrl: string
  isSaving?: boolean
  onClose: () => void
  onSaveDetails: (input: {
    name: string
    title: string
    alt: string
  }) => Promise<void>
}

export default function ExpandedPreviewDialog({
  preview,
  previewUrl,
  isSaving = false,
  onClose,
  onSaveDetails,
}: ExpandedPreviewDialogProps) {
  const t = useTranslations()
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [alt, setAlt] = useState('')

  useEffect(() => {
    setName(preview?.name || '')
    setTitle(preview?.title || '')
    setAlt(preview?.alt || '')
  }, [preview?._id, preview?.title, preview?.name, preview?.alt])

  const hasChanges =
    !!preview &&
    (name.trim() !== (preview.name || '') ||
      title.trim() !== (preview.title || '') ||
      alt.trim() !== (preview.alt || ''))

  const optimizationLabel = preview?.optimized
    ? preview.optimizedFormat
      ? t('media.optimizedWithFormat', { format: preview.optimizedFormat })
      : t('media.yes')
    : t('media.no')

  const previewVariantLabel =
    preview?.previewUrl || preview?.previewKey
      ? t('media.available')
      : t('media.no')

  return (
    <Dialog
      open={!!preview}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-[95vw] p-4 sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="truncate">
            {preview?.name || preview?.title || t('media.preview')}
          </DialogTitle>
          <DialogDescription className="truncate">
            {preview
              ? `${preview.mime} · ${formatFileSize(preview.size)}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[85vh] min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-h-[55vh] items-center justify-center overflow-hidden rounded-md border bg-muted/30 lg:min-h-[70vh]">
            {!preview || !previewUrl ? (
              <Skeleton className="h-full w-full" />
            ) : isImage(preview.mime) ? (
              <RakunImage
                image={{
                  key:
                    preview.previewUrl && !preview.previewUrl.startsWith('data:')
                      ? preview.previewKey || preview.key
                      : preview.key,
                  access: preview.access,
                  url: previewUrl || preview.url,
                  previewUrl: preview.previewUrl?.startsWith('data:')
                    ? preview.previewUrl
                    : undefined,
                  name: preview.name,
                  title: preview.title,
                  alt: preview.alt,
                  width: preview.width,
                  height: preview.height,
                  sizes: preview.sizes,
                }}
                sizes="min(90vw, 960px)"
                className="h-full w-full object-contain"
              />
            ) : isVideo(preview.mime) ? (
              <video
                src={previewUrl}
                controls
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="rounded-full border p-3 text-muted-foreground">
                  <FileTypeIcon mime={preview.mime} />
                </div>
                <p className="text-muted-foreground text-sm">
                  {t('media.noInlinePreview')}
                </p>
                <Button asChild variant="outline">
                  <a href={previewUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" />
                    {t('media.openFile')}
                  </a>
                </Button>
              </div>
            )}
          </div>

          <ScrollArea className="min-h-0 rounded-md border">
            {preview ? (
              <div className="space-y-4 p-3 text-sm">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="media-name">{t('fields.name')}</Label>
                    <Input
                      id="media-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="media-title">{t('fields.title')}</Label>
                    <Input
                      id="media-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="media-alt">{t('media.alt')}</Label>
                    <Input
                      id="media-alt"
                      value={alt}
                      onChange={(event) => setAlt(event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={!hasChanges || isSaving}
                    onClick={() => {
                      void onSaveDetails({
                        name: name.trim(),
                        title: title.trim(),
                        alt: alt.trim(),
                      })
                    }}
                  >
                    {t('common.save')}
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <p className="text-muted-foreground text-xs">{t('media.mime')}</p>
                    <p className="font-medium break-all">{preview.mime}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('media.size')}</p>
                    <p className="font-medium">
                      {formatFileSize(preview.size)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {t('media.originalSize')}
                    </p>
                    <p className="font-medium">
                      {preview.originalSize != null
                        ? formatFileSize(preview.originalSize)
                        : t('media.na')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('media.dimensions')}</p>
                    <p className="font-medium">
                      {preview.width && preview.height
                        ? `${preview.width}x${preview.height}`
                        : t('media.na')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('media.orientation')}</p>
                    <p className="font-medium">
                      {preview.orientation || t('media.na')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {t('media.optimization')}
                    </p>
                    <p className="font-medium">{optimizationLabel}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('media.quality')}</p>
                    <p className="font-medium">
                      {preview.optimizationQuality != null
                        ? preview.optimizationQuality
                        : t('media.na')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {t('media.previewVariant')}
                    </p>
                    <p className="font-medium">{previewVariantLabel}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('media.saved')}</p>
                    <p className="font-medium">
                      {preview.originalSize &&
                      preview.originalSize > preview.size
                        ? `${formatFileSize(preview.originalSize - preview.size)} (${formatPercent(((preview.originalSize - preview.size) / preview.originalSize) * 100)})`
                        : t('media.na')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-sm">{t('media.responsiveSizes')}</p>
                  {preview.sizes?.length ? (
                    <div className="space-y-2">
                      {preview.sizes.map((size) => {
                        const widthLabel = `${size.width}w`
                        const dimensions = `${size.width}x${size.height}`
                        return (
                          <div
                            key={size.key}
                            className="rounded-md border p-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{widthLabel}</span>
                              <span className="text-muted-foreground">
                                {formatFileSize(size.size)}
                              </span>
                            </div>
                            <p className="text-muted-foreground">{dimensions}</p>
                            <p className="truncate text-muted-foreground">
                              {size.mime}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">{t('media.na')}</p>
                  )}
                </div>
              </div>
            ) : null}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
