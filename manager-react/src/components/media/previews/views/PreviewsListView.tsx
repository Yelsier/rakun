'use client'

import { Check } from 'lucide-react'

import { Checkbox } from '../../../ui/checkbox'
import { ContextMenu, ContextMenuTrigger } from '../../../ui/context-menu'
import MediaContextMenuContent from '../MediaContextMenuContent'
import { useMediaPreview } from '../context/MediaPreviewContext'

import { useTranslations } from '@/i18n'
import { cn } from '@/lib/utils'
import type { MediaRecord } from '@/lib/media'

type PreviewsListViewProps = {
  media: MediaRecord[]
}

export default function PreviewsListView({ media }: PreviewsListViewProps) {
  const t = useTranslations()
  const {
    onMediaClick,
    renderPreview,
    formatFileSize,
    isSelected,
    bulkSelectedIds,
    canBulkSelect,
    onToggleBulkSelection,
    onSelectVisible,
  } = useMediaPreview()
  const allVisibleSelected =
    media.length > 0 && media.every((item) => bulkSelectedIds.has(item._id))
  const someVisibleSelected = media.some((item) =>
    bulkSelectedIds.has(item._id),
  )
  const listColumns = cn(
    'grid items-center gap-3',
    canBulkSelect
      ? 'grid-cols-[40px_56px_minmax(0,1fr)] md:grid-cols-[40px_56px_minmax(0,1fr)_minmax(0,180px)] xl:grid-cols-[40px_56px_minmax(0,1fr)_minmax(0,180px)_110px]'
      : 'grid-cols-[56px_minmax(0,1fr)] md:grid-cols-[56px_minmax(0,1fr)_minmax(0,180px)] xl:grid-cols-[56px_minmax(0,1fr)_minmax(0,180px)_110px]',
  )

  return (
    <div className='relative w-full overflow-hidden rounded-lg border'>
      <div
        className={cn(
          listColumns,
          'border-b bg-muted/40 px-3 py-2 text-muted-foreground text-xs',
        )}
      >
        {canBulkSelect ? (
          <div className='flex items-center justify-center'>
            <Checkbox
              checked={
                allVisibleSelected ||
                (someVisibleSelected && 'indeterminate')
              }
              onCheckedChange={(value) =>
                onSelectVisible(media, value === true)
              }
              aria-label='Select all visible files'
            />
          </div>
        ) : null}
        <span>{t('media.preview')}</span>
        <span>{t('fields.name')}</span>
        <span className='hidden md:block'>{t('media.typeSize')}</span>
        <span className='hidden xl:block'>{t('media.date')}</span>
      </div>
      {media.map((item) => (
        <ContextMenu key={item._id}>
          <ContextMenuTrigger asChild>
            <div
              role='button'
              tabIndex={0}
              data-selected={
                bulkSelectedIds.has(item._id) ? 'true' : undefined
              }
              className={cn(
                listColumns,
                'w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-accent/40 data-[selected=true]:bg-accent/40 data-[state=open]:bg-accent/60 data-[state=open]:ring-1 data-[state=open]:ring-primary/30',
              )}
              onClick={() => onMediaClick(item)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onMediaClick(item)
              }}
            >
              {canBulkSelect ? (
                <div
                  className='flex items-center justify-center'
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={bulkSelectedIds.has(item._id)}
                    onCheckedChange={() => onToggleBulkSelection(item)}
                    aria-label={`Select ${item.name}`}
                  />
                </div>
              ) : null}
              <div className='h-12 w-12 overflow-hidden rounded-md border bg-muted'>
                {renderPreview(item)}
              </div>
              <div className='min-w-0'>
                <p className='truncate font-medium text-sm'>
                  {isSelected(item._id) && !bulkSelectedIds.has(item._id) ? (
                    <span className='mr-2 inline-flex rounded-full bg-primary p-0.5 text-primary-foreground align-middle'>
                      <Check className='size-3' />
                    </span>
                  ) : null}
                  {item.name}
                </p>
              </div>
              <p className='hidden truncate text-muted-foreground text-xs md:block'>
                {[item.mime, formatFileSize(item.size)].join(' · ')}
              </p>
              <p className='hidden text-muted-foreground text-xs tabular-nums xl:block'>
                {new Date(item.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </ContextMenuTrigger>
          <MediaContextMenuContent item={item} />
        </ContextMenu>
      ))}
    </div>
  )
}
