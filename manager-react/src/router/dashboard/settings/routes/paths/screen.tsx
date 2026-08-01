'use client'

import type { SortingState } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { columns, type RouteMapRecord } from './columns'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import { confirm } from '@/components/confirm'
import { transformSortingState } from '@/helpers/transform-sorting-state'
import Loading from '@/components/loading'
import { PaginationController } from '@/components/PaginationController'
import UnauthorizedMessage from '@/components/unauthorized'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { SearchInput } from '@/components/search-input'
import { useTranslations } from '@/i18n'
import { useSession } from '@/state/session'

export const ManagerSettingsRoutePathsScreen = () => {
  const t = useTranslations()
  const { hasPermissions } = useSession()
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sorting, setSorting] = useState<SortingState>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const canReadRoutes = hasPermissions(['content.Route.readAny'])
  const canUpdateRoutes = hasPermissions(['content.Route.updateAny'])
  const trimmedSearch = debouncedSearch.trim()
  const listQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'RouteMap',
      query: {
        filter: trimmedSearch
          ? {
              path: {
                $contains: trimmedSearch,
              },
            }
          : undefined,
        options: {
          limit: itemsPerPage,
          page,
          sort: transformSortingState(sorting),
        },
      },
    },
    enabled: canReadRoutes,
  })
  const regenerateMutation = useManagerMutation('manager.regenerateRoutes')

  useEffect(() => {
    setPage(1)
  }, [trimmedSearch])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [search])

  if (!canReadRoutes) {
    return <UnauthorizedMessage neededPermission={['content.Route.readAny']} />
  }

  if (!listQuery.data) {
    return <Loading />
  }

  const handleRegenerate = async () => {
    await confirm({
      title: t('settings.routes.regenerateTitle'),
      description: t('settings.routes.regenerateDescription'),
      confirmLabel: t('settings.routes.regenerateConfirm'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const result = await regenerateMutation.mutateAsync(undefined)
          if (!result.ok) {
            toast.error(t('settings.routes.regenerateError'))
            throw new Error('regenerate failed')
          }
          toast.success(t('settings.routes.regenerated'))
          await listQuery.refetch()
        } catch (error) {
          if (error instanceof Error && error.message === 'regenerate failed') throw error
          toast.error(error instanceof Error ? error.message : t('settings.routes.regenerateError'))
          throw error
        }
      },
    })
  }

  return (
    <div className="container mx-auto flex flex-col items-start gap-4 py-10">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('settings.routes.searchPath')}
          className="max-w-md"
        />
        {canUpdateRoutes ? (
          <div data-tour="route-paths-regenerate">
            <Button onClick={() => void handleRegenerate()}>{t('settings.routes.regenerate')}</Button>
          </div>
        ) : null}
      </div>
      <div className="w-full" data-tour="route-paths-table">
        <DataTable
          sorting={sorting}
          setSorting={setSorting}
          columns={columns({ t })}
          data={listQuery.data.items as RouteMapRecord[]}
        />
      </div>
      <PaginationController
        page={page}
        setPage={setPage}
        totalItems={listQuery.data.totalItems}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
      />
    </div>
  )
}
