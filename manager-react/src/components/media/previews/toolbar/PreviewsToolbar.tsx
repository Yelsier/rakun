'use client'

import {
  FilmIcon,
  FolderInput,
  Grid2x2,
  Image,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  Upload,
  FileText,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '../../../ui/button'
import { FileUploadClear, FileUploadTrigger } from '../../../ui/file-upload'
import { Input } from '../../../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select'
import { Switch } from '../../../ui/switch'
import { ToggleGroup, ToggleGroupItem } from '../../../ui/toggle-group'
import { useMediaLibrary } from '../../contexts/MediaLibraryContext'
import { useMediaPreview } from '../context/MediaPreviewContext'

import { SearchInput } from '@/components/search-input'
import { useTranslations } from '@/i18n'

const IMAGE_OPTIMIZE_FORMATS = ['webp', 'jpeg', 'png', 'avif'] as const

export default function PreviewsToolbar({ children }: { children?: ReactNode }) {
  const t = useTranslations()
  const {
    mediaCount,
    isUploading,
    mediaTypeFilter,
    isMediaTypeFilterLocked,
    setMediaTypeFilter,
    searchTerm,
    setSearchTerm,
    viewMode,
    setViewMode,
    canBulkSelect,
    areAllVisibleSelected,
    onToggleSelectAllVisible,
  } = useMediaPreview()
  const {
    optimizeEnabled,
    optimizeLocked,
    optimizeOptions,
    setOptimizeEnabled,
    setOptimizeOptions,
    optimizationMediaType,
    setOptimizationMediaType,
    currentFolderPath,
  } = useMediaLibrary()

  return (
    <div
      className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
      data-tour="media-toolbar"
    >
      <p className="order-1 text-muted-foreground text-sm md:col-start-1 md:row-start-1">
        {t('media.currentFolder')}{' '}
        <span className="font-medium text-foreground">{currentFolderPath}</span>
      </p>
      {children ? (
        <div className="order-3 min-w-0 md:col-span-2 md:row-start-2">{children}</div>
      ) : null}
      <p className="order-4 text-muted-foreground text-sm md:col-span-2 md:row-start-3">
        {t('media.fileCount', { count: mediaCount })}
      </p>
      <div className="contents">
        <SearchInput
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={t('media.searchFiles')}
          className="order-5 h-8 w-full md:col-start-1 md:row-start-4 md:max-w-xs"
          data-tour="media-search"
        />
        <div className="order-2 flex flex-wrap items-center gap-2 md:col-start-2 md:row-start-1 md:justify-end">
          <FileUploadTrigger asChild>
            <Button size="sm" variant="outline">
              <Upload className="size-4" />
              {t('common.upload')}
            </Button>
          </FileUploadTrigger>
          <FileUploadClear className="inline-flex h-8 items-center rounded-md border px-3 font-medium text-sm hover:bg-accent/40">
            {t('common.clear')}
          </FileUploadClear>
          {canBulkSelect && mediaCount > 0 ? (
            <Button size="sm" variant="outline" onClick={onToggleSelectAllVisible}>
              {areAllVisibleSelected ? t('common.deselect') : t('common.selectAll')}
            </Button>
          ) : null}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                <SlidersHorizontal className="size-4" />
                {t('media.optimization')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm">{t('media.enableOptimization')}</p>
                <Switch
                  checked={optimizeEnabled}
                  disabled={optimizeLocked}
                  onCheckedChange={setOptimizeEnabled}
                />
              </div>
              {optimizeLocked ? (
                <p className="text-muted-foreground text-xs">{t('media.optimizationEnforced')}</p>
              ) : null}
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">{t('media.format')}</p>
                <Select
                  value={optimizationMediaType}
                  disabled={!optimizeEnabled}
                  onValueChange={(value) => setOptimizationMediaType(value as 'image' | 'video')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('media.selectFormat')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">{t('media.filterImages')}</SelectItem>
                    <SelectItem value="video">{t('media.filterVideos')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {optimizationMediaType === 'image' ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">{t('media.outputFormat')}</p>
                  <Select
                    value={optimizeOptions.format}
                    disabled={!optimizeEnabled}
                    onValueChange={(value) =>
                      setOptimizeOptions({
                        format: value as 'webp' | 'jpeg' | 'png' | 'avif',
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('media.selectFormat')} />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_OPTIMIZE_FORMATS.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">{t('media.outputFormats')}</p>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {t('media.videoOutputFormats')}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">{t('media.qualityRange')}</p>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  disabled={!optimizeEnabled}
                  value={
                    optimizationMediaType === 'video'
                      ? (optimizeOptions.video?.quality ?? 80)
                      : optimizeOptions.quality
                  }
                  onChange={(event) => {
                    const parsed = Number(event.target.value)
                    if (!Number.isFinite(parsed)) return
                    const value = Math.max(1, Math.min(100, Math.round(parsed)))
                    if (optimizationMediaType === 'video') {
                      setOptimizeOptions({ video: { quality: value } })
                    } else {
                      setOptimizeOptions({ quality: value })
                    }
                  }}
                />
              </div>
              {optimizationMediaType === 'image' ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">{t('media.generatePreview')}</p>
                    <Switch
                      checked={optimizeOptions.generatePreview}
                      disabled={!optimizeEnabled}
                      onCheckedChange={(value) => setOptimizeOptions({ generatePreview: value })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">{t('media.generateResponsiveSizes')}</p>
                    <Switch
                      checked={optimizeOptions.generateSizes ?? true}
                      disabled={!optimizeEnabled}
                      onCheckedChange={(value) => setOptimizeOptions({ generateSizes: value })}
                    />
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {t('media.videoFormatsDescription')}
                </p>
              )}
            </PopoverContent>
          </Popover>
          {isUploading ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin" />
              {t('media.uploading')}
            </span>
          ) : null}
        </div>
      </div>
      <div className="order-6 flex w-full min-w-0 items-center justify-between gap-2 md:col-start-2 md:row-start-4 md:justify-end">
        {!isMediaTypeFilterLocked ? (
          <ToggleGroup
            type="single"
            size="sm"
            value={mediaTypeFilter}
            onValueChange={(value) => {
              if (value) setMediaTypeFilter(value as 'all' | 'image' | 'video' | 'document')
            }}
            variant="outline"
            className="min-w-0 flex-1 sm:w-fit sm:flex-none"
          >
            <ToggleGroupItem
              value="all"
              aria-label={t('common.all')}
              className="whitespace-nowrap max-sm:px-2 sm:flex-none"
            >
              {t('common.all')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="image"
              aria-label={t('media.filterImages')}
              className="whitespace-nowrap max-sm:px-2 sm:flex-none"
            >
              <Image className="size-4" />
              <span className="hidden sm:inline">{t('media.filterImages')}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="video"
              aria-label={t('media.filterVideos')}
              className="whitespace-nowrap max-sm:px-2 sm:flex-none"
            >
              <FilmIcon className="size-4" />
              <span className="hidden sm:inline">{t('media.filterVideos')}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="document"
              aria-label={t('media.filterDocs')}
              className="whitespace-nowrap max-sm:px-2 sm:flex-none"
            >
              <FileText className="size-4" />
              <span className="hidden sm:inline">{t('media.filterDocs')}</span>
            </ToggleGroupItem>
          </ToggleGroup>
        ) : null}

        <ToggleGroup
          type="single"
          size="sm"
          value={viewMode}
          onValueChange={(value) => {
            if (value) setViewMode(value as 'list' | 'grid-sm' | 'grid-lg')
          }}
          variant="outline"
          className="shrink-0"
        >
          <ToggleGroupItem value="list" aria-label={t('media.listView')}>
            <List className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid-sm" aria-label={t('media.smallGridView')}>
            <Grid2x2 className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid-lg" aria-label={t('media.largeGridView')}>
            <LayoutGrid className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}

export function PreviewsSelectionToolbar() {
  const t = useTranslations()
  const {
    bulkSelectedCount,
    canReimportWithOptimization,
    onRequestBulkDelete,
    onRequestBulkMove,
    onRequestBulkReimport,
    onClearSelection,
  } = useMediaPreview()

  if (bulkSelectedCount === 0) return null

  return (
    <div
      className="fixed bottom-12 left-1/2 z-70 -translate-x-1/2 animate-in fade-in-0 slide-in-from-bottom-3 duration-200"
      data-tour="media-selection-toolbar"
    >
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 shadow-lg">
        <span className="min-w-20 text-center text-muted-foreground text-sm">
          {t('contentList.selectedCount', { count: bulkSelectedCount })}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={!canReimportWithOptimization}
          onClick={onRequestBulkReimport}
        >
          <RefreshCw className="size-4" />
          {canReimportWithOptimization
            ? t('media.reimportConfirm')
            : t('media.enableOptimizationToReimport')}
        </Button>
        <Button size="sm" variant="outline" onClick={onRequestBulkMove}>
          <FolderInput className="size-4" />
          {t('common.move')}
        </Button>
        <Button size="sm" variant="destructive" onClick={onRequestBulkDelete}>
          <Trash2 className="size-4" />
          {t('common.delete')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  )
}
