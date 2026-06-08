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
import { useSession } from '@/state/session'

export const ManagerSettingsRoutePathsScreen = () => {
  const { hasPermissions } = useSession()
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sorting, setSorting] = useState<SortingState>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const canReadRoutes = hasPermissions(['manager.routes.readAny'])
  const canUpdateRoutes = hasPermissions(['manager.routes.updateAny'])
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
    return <UnauthorizedMessage neededPermission={['manager.routes.readAny']} />
  }

  if (!listQuery.data) {
    return <Loading />
  }

  const handleRegenerate = async () => {
    try {
      const result = await regenerateMutation.mutateAsync(undefined)
      if (!result.ok) {
        toast.error('Error regenerating routes')
      } else {
        toast.success('Routes regenerated successfully')
      }
      await listQuery.refetch()
      setConfirmOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error regenerating routes')
    }
  }

  return (
    <div className="container mx-auto flex flex-col items-start gap-4 py-10">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search path..."
          className="max-w-md"
        />
        {canUpdateRoutes ? (
          <div data-tour="route-paths-regenerate">
            <Button onClick={() => setConfirmOpen(true)}>Regenerar rutas</Button>
          </div>
        ) : null}
      </div>
      <div className="w-full" data-tour="route-paths-table">
        <DataTable
          sorting={sorting}
          setSorting={setSorting}
          columns={columns()}
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
            <DialogTitle>Regenerate all routes</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to regenerate all routes? This process can be time-consuming if
            the number of routes is large.
          </DialogDescription>
          <DialogFooter className="flex w-full justify-between gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={regenerateMutation.isPending}
              variant="destructive"
              onClick={() => void handleRegenerate()}
            >
              Yes, regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
