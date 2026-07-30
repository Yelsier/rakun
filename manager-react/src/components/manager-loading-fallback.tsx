import { Command } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from '@/i18n'

export const ManagerLoadingFallback = () => {
  const t = useTranslations()
  const sidebarItems = Array.from({ length: 7 }, (_, index) => index)
  const cards = Array.from({ length: 3 }, (_, index) => index)
  const rows = Array.from({ length: 8 }, (_, index) => index)

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="bg-sidebar flex min-h-svh w-full overflow-hidden"
      role="status"
    >
      <span className="sr-only">{t('common.loadingManager')}</span>

      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar p-2 text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 px-2">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Command className="size-4" />
          </div>
          <div className="grid flex-1 gap-1">
            <Skeleton className="h-4 w-16 bg-sidebar-accent" />
            <Skeleton className="h-3 w-24 bg-sidebar-accent" />
          </div>
        </div>

        <div className="mt-4 flex flex-1 flex-col gap-1 px-2">
          {sidebarItems.map((item) => (
            <div key={item} className="flex h-8 items-center gap-2 rounded-md px-2">
              <Skeleton className="size-4 bg-sidebar-accent" />
              <Skeleton
                className="h-4 bg-sidebar-accent"
                style={{ width: `${item % 3 === 0 ? 8 : item % 3 === 1 ? 11 : 6}rem` }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-2 py-3">
          <Skeleton className="size-8 rounded-lg bg-sidebar-accent" />
          <div className="grid flex-1 gap-1">
            <Skeleton className="h-4 w-24 bg-sidebar-accent" />
            <Skeleton className="h-3 w-32 bg-sidebar-accent" />
          </div>
        </div>
      </aside>

      <main className="bg-background m-0 flex min-w-0 flex-1 flex-col p-4 pt-0 md:m-2 md:ml-0 md:rounded-xl md:border">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="hidden h-4 w-px sm:block" />
            <Skeleton className="h-4 w-36 sm:w-48" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <Skeleton key={card} className="aspect-video rounded-xl" />
            ))}
          </div>
          <section className="min-h-0 flex-1 rounded-xl border p-4">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
            <div className="grid gap-3">
              {rows.map((row) => (
                <div
                  key={row}
                  className="grid grid-cols-[minmax(0,1fr)_7rem_5rem] items-center gap-4"
                >
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export const ManagerAuthLoadingFallback = () => {
  const t = useTranslations()

  return (
    <div
      aria-busy='true'
      aria-live='polite'
      className='bg-background flex min-h-svh items-center justify-center p-6 md:p-10'
      role='status'
    >
      <span className='sr-only'>{t('common.loadingManager')}</span>
      <div className='w-full max-w-sm space-y-6 rounded-xl border p-6 shadow-sm'>
        <div className='flex flex-col items-center gap-3'>
          <Skeleton className='size-8 rounded-md' />
          <Skeleton className='h-6 w-48 max-w-full' />
          <Skeleton className='h-4 w-64 max-w-full' />
        </div>
        <div className='space-y-5'>
          <div className='space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-9 w-full rounded-md' />
          </div>
          <div className='space-y-2'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-9 w-full rounded-md' />
          </div>
          <Skeleton className='h-9 w-full rounded-md' />
        </div>
      </div>
    </div>
  )
}
