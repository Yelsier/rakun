'use client'

import { Skeleton } from '../../../ui/skeleton'

type ViewMode = 'list' | 'grid-sm' | 'grid-lg'

type PreviewsViewLoaderProps = {
  viewMode: ViewMode
}

export default function PreviewsViewLoader({ viewMode }: PreviewsViewLoaderProps) {
  if (viewMode === 'list') {
    return (
      <div className='w-full space-y-2'>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`media-list-skeleton-${index}`}
            className='grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-md border px-3 py-2 md:grid-cols-[56px_minmax(0,1fr)_minmax(0,180px)] xl:grid-cols-[56px_minmax(0,1fr)_minmax(0,180px)_110px]'
          >
            <Skeleton className='h-12 w-12 rounded-md' />
            <Skeleton className='h-4 w-[70%]' />
            <Skeleton className='hidden h-4 w-[85%] md:block' />
            <Skeleton className='hidden h-4 w-[70%] xl:block' />
          </div>
        ))}
      </div>
    )
  }

  if (viewMode === 'grid-sm') {
    return (
      <div className='grid w-full grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4'>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={`media-grid-sm-skeleton-${index}`} className='rounded-lg border p-2'>
            <Skeleton className='h-28 w-full rounded-md' />
            <div className='mt-2 space-y-2'>
              <Skeleton className='h-4 w-[70%]' />
              <Skeleton className='h-3 w-[50%]' />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className='grid w-full grid-cols-1 gap-3 md:grid-cols-2'>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`media-grid-lg-skeleton-${index}`} className='rounded-lg border p-3'>
          <Skeleton className='h-52 w-full rounded-md' />
          <div className='mt-2 space-y-2'>
            <Skeleton className='h-4 w-[70%]' />
            <Skeleton className='h-3 w-[50%]' />
          </div>
        </div>
      ))}
    </div>
  )
}
