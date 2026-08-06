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

const OPTIMIZE_FORMATS = ['webp', 'jpeg', 'png', 'avif'] as const

export default function PreviewsToolbar() {
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
  } = useMediaLibrary()

  return (
    <div className="space-y-2" data-tour="media-toolbar">
      <p className="text-muted-foreground text-sm">{t('media.fileCount', { count: mediaCount })}</p>
      <div className="flex w-full justify-between flex-wrap items-center gap-2">
        <SearchInput
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={t('media.searchFiles')}
          className="h-8 min-w-56 max-w-xs flex-1 basis-56"
          data-tour="media-search"
        />
        <div className="flex flex-wrap items-center gap-2">
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
                    {OPTIMIZE_FORMATS.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">{t('media.qualityRange')}</p>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  disabled={!optimizeEnabled}
                  value={optimizeOptions.quality}
                  onChange={(event) => {
                    const parsed = Number(event.target.value)
                    if (!Number.isFinite(parsed)) return
                    const value = Math.max(1, Math.min(100, Math.round(parsed)))
                    setOptimizeOptions({ quality: value })
                  }}
                />
              </div>
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
      <div className="flex min-w-0 flex-wrap items-center gap-2 justify-end">
        {!isMediaTypeFilterLocked ? (
          <ToggleGroup
            type="single"
            size="sm"
            value={mediaTypeFilter}
            onValueChange={(value) => {
              if (value) setMediaTypeFilter(value as 'all' | 'image' | 'video' | 'document')
            }}
            variant="outline"
            className="max-w-full flex-wrap"
          >
            <ToggleGroupItem
              value="all"
              aria-label="All files"
              className="flex-none whitespace-nowrap"
            >
              {t('common.all')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="image"
              aria-label="Images"
              className="flex-none whitespace-nowrap"
            >
              <Image className="size-4" />
              {t('media.filterImages')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="video"
              aria-label="Videos"
              className="flex-none whitespace-nowrap"
            >
              <FilmIcon className="size-4" />
              {t('media.filterVideos')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="document"
              aria-label="Documents"
              className="flex-none whitespace-nowrap"
            >
              <FileText className="size-4" />
              {t('media.filterDocs')}
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
        >
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid-sm" aria-label="Small cards view">
            <Grid2x2 className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid-lg" aria-label="Large cards view">
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
