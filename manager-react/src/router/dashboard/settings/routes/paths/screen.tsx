'use client'

import type { SortingState } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { columns, type RouteMapRecord } from './columns'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import { transformSortingState } from '@/helpers/transform-sorting-state'
import Loading from '@/components/loading'
import { PaginationController } from '@/components/PaginationController'
import UnauthorizedMessage from '@/components/unauthorized'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { SearchInput } from '@/components/search-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const [confirmOpen, setConfirmOpen] = useState(false)
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
    try {
      const result = await regenerateMutation.mutateAsync(undefined)
      if (!result.ok) {
        toast.error(t('settings.routes.regenerateError'))
      } else {
        toast.success(t('settings.routes.regenerated'))
      }
      await listQuery.refetch()
      setConfirmOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.routes.regenerateError'))
    }
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
            <Button onClick={() => setConfirmOpen(true)}>{t('settings.routes.regenerate')}</Button>
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
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent aria-describedby="Confirm action">
          <DialogHeader>
            <DialogTitle>{t('settings.routes.regenerateTitle')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
{t('settings.routes.regenerateDescription')}
          </DialogDescription>
          <DialogFooter className="flex w-full justify-between gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              loading={regenerateMutation.isPending}
              variant="destructive"
              onClick={() => void handleRegenerate()}
            >
              {t('settings.routes.regenerateConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
