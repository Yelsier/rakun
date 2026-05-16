'use client'

import {
  FilmIcon,
  Grid2x2,
  Image,
  LayoutGrid,
  List,
  Loader2,
  Upload,
  FileText,
  SlidersHorizontal,
} from 'lucide-react'

import { Button } from '../../../ui/button'
import { FileUploadClear, FileUploadTrigger } from '../../../ui/file-upload'
import { Input } from '../../../ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select'
import { Switch } from '../../../ui/switch'
import { ToggleGroup, ToggleGroupItem } from '../../../ui/toggle-group'
import { useMediaLibrary } from '../../contexts/MediaLibraryContext'
import { useMediaPreview } from '../context/MediaPreviewContext'

export default function PreviewsToolbar() {
  const {
    mediaCount,
    isUploading,
    mediaTypeFilter,
    isMediaTypeFilterLocked,
    setMediaTypeFilter,
    viewMode,
    setViewMode,
  } = useMediaPreview()
  const {
    optimizeEnabled,
    optimizeLocked,
    optimizeOptions,
    setOptimizeEnabled,
    setOptimizeOptions,
  } = useMediaLibrary()

  return (
    <div
      className='flex items-center justify-between gap-2 flex-wrap'
      data-tour='media-toolbar'
    >
      <p className='text-muted-foreground text-sm'>
        {mediaCount} file{mediaCount === 1 ? '' : 's'}
      </p>
      <div className='flex items-center gap-2 flex-wrap'>
        <FileUploadTrigger asChild>
          <Button size={'sm'} variant={'outline'}>
            <Upload className='size-4' />
            Upload
          </Button>
        </FileUploadTrigger>
        <FileUploadClear className='inline-flex items-center rounded-md border px-3 py-1.5 font-medium text-sm hover:bg-accent/40'>
          Clear
        </FileUploadClear>
        <Popover>
          <PopoverTrigger asChild>
            <Button size='sm' variant='outline'>
              <SlidersHorizontal className='size-4' />
              Optimization
            </Button>
          </PopoverTrigger>
          <PopoverContent align='end' className='w-80 space-y-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='font-medium text-sm'>Enable optimization</p>
              <Switch
                checked={optimizeEnabled}
                disabled={optimizeLocked}
                onCheckedChange={setOptimizeEnabled}
              />
            </div>
            {optimizeLocked ? (
              <p className='text-muted-foreground text-xs'>
                Optimization is enforced by this field configuration.
              </p>
            ) : null}
            <div className='space-y-2'>
              <p className='text-muted-foreground text-xs'>Format</p>
              <Select
                value={optimizeOptions.format}
                disabled={!optimizeEnabled}
                onValueChange={(value) =>
                  setOptimizeOptions({
                    format: value as 'webp' | 'jpeg' | 'png' | 'avif',
                  })
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select format' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='webp'>webp</SelectItem>
                  <SelectItem value='jpeg'>jpeg</SelectItem>
                  <SelectItem value='png'>png</SelectItem>
                  <SelectItem value='avif'>avif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <p className='text-muted-foreground text-xs'>Quality (1-100)</p>
              <Input
                type='number'
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
            <div className='flex items-center justify-between gap-2'>
              <p className='text-sm'>Generate preview</p>
              <Switch
                checked={optimizeOptions.generatePreview}
                disabled={!optimizeEnabled}
                onCheckedChange={(value) =>
                  setOptimizeOptions({ generatePreview: value })
                }
              />
            </div>
            <div className='flex items-center justify-between gap-2'>
              <p className='text-sm'>Generate responsive sizes</p>
              <Switch
                checked={optimizeOptions.generateSizes ?? true}
                disabled={!optimizeEnabled}
                onCheckedChange={(value) =>
                  setOptimizeOptions({ generateSizes: value })
                }
              />
            </div>
          </PopoverContent>
        </Popover>
        {isUploading ? (
          <span className='inline-flex items-center gap-1 text-muted-foreground text-sm'>
            <Loader2 className='size-4 animate-spin' />
            Uploading...
          </span>
        ) : null}

        {!isMediaTypeFilterLocked ? (
          <ToggleGroup
            type='single'
            value={mediaTypeFilter}
            onValueChange={(value) => {
              if (value) setMediaTypeFilter(value as 'all' | 'image' | 'video' | 'document')
            }}
            variant='outline'
            className='max-w-full flex-wrap'
          >
            <ToggleGroupItem
              value='all'
              aria-label='All files'
              className='flex-none whitespace-nowrap'
            >
              All
            </ToggleGroupItem>
            <ToggleGroupItem
              value='image'
              aria-label='Images'
              className='flex-none whitespace-nowrap'
            >
              <Image className='size-4' />
              Images
            </ToggleGroupItem>
            <ToggleGroupItem
              value='video'
              aria-label='Videos'
              className='flex-none whitespace-nowrap'
            >
              <FilmIcon className='size-4' />
              Videos
            </ToggleGroupItem>
            <ToggleGroupItem
              value='document'
              aria-label='Documents'
              className='flex-none whitespace-nowrap'
            >
              <FileText className='size-4' />
              Docs
            </ToggleGroupItem>
          </ToggleGroup>
        ) : null}

        <ToggleGroup
          type='single'
          value={viewMode}
          onValueChange={(value) => {
            if (value) setViewMode(value as 'list' | 'grid-sm' | 'grid-lg')
          }}
          variant='outline'
        >
          <ToggleGroupItem value='list' aria-label='List view'>
            <List className='size-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='grid-sm' aria-label='Small cards view'>
            <Grid2x2 className='size-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='grid-lg' aria-label='Large cards view'>
            <LayoutGrid className='size-4' />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}
