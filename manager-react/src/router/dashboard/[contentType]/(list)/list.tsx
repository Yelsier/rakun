'use client'
import { useQuery } from '@tanstack/react-query'
import { Archive, Plus, RotateCcw, Trash } from 'lucide-react'
import { useState } from 'react'
import { Permission } from '@rakun-kit/core/client'
import { toast } from 'sonner'

import { columns } from './columns'
import DeleteCT from './delete'

import { ManagerLink } from '@/link'
import Loading from '@/components/loading'
import { PaginationController } from '@/components/PaginationController'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/state/language'
import { useTRPC } from '@/components/trpc-provider'
import { useSession } from '@/state/session'
import { useManagerMutation } from '@/client/react'

const ListContents: React.FC<{ contentType: string; fields?: string[] }> = ({
  contentType,
  fields,
}) => {
  const [page, setPage] = useState(1)
  const [isTrash, setIsTrash] = useState(false)
  const [deleteItem, setDeleteItem] = useState<{ _id: string } | null>(null)
  const [permanentDeleteItem, setPermanentDeleteItem] = useState<{
    _id: string
  } | null>(null)
  const [restoreItem, setRestoreItem] = useState<Record<string, unknown> | null>(
    null,
  )
  const { getTranslation } = useLanguage()
  const trpc = useTRPC()
  const { hasAnyPermission, hasPermissions } = useSession()
  const { data, refetch } = useQuery(
    trpc.manager.list.queryOptions({
      contentType,
      query: {
        filter: isTrash ? { _trashed: true } : undefined,
        options: {
          limit: 10,
          page,
          fields: fields
            ? [
                ...fields,
                '_trashed',
                '_visibility',
                '_visibilityBeforeTrash',
              ]
            : undefined,
        },
      },
    }),
  )
  const restoreMutation = useManagerMutation('manager.update')

  const restore = async () => {
    if (!restoreItem) return

    await restoreMutation.mutateAsync({
      contentType,
      id: restoreItem._id as string,
      data: {
        _trashed: false,
        ...(restoreItem._visibility === 'trash'
          ? {
              _visibility:
                restoreItem._visibilityBeforeTrash ?? 'published',
            }
          : {}),
      },
    })
    toast.success('Item restored')
    setRestoreItem(null)
    await refetch()
  }

  if (!data) {
    return <Loading />
  }

  const typedData = data as { totalItems: number; items: object[] }
  const { totalItems, items } = typedData
  const canCreate = hasAnyPermission([
    `content.${contentType}.own` as Permission,
    `content.${contentType}.updateAny` as Permission,
  ])

  return (
    <div className='container mx-auto flex flex-col gap-6 px-4 py-10'>
      <Tabs
        value={isTrash ? 'trash' : 'active'}
        onValueChange={(value) => {
          setIsTrash(value === 'trash')
          setPage(1)
        }}
        className='w-full'
      >
        <div className='flex items-center justify-between border-b pb-3'>
          <TabsList variant='line'>
            <TabsTrigger value='active'>
              <Archive />
              Active
            </TabsTrigger>
            <TabsTrigger value='trash'>
              <Trash />
              Trash
            </TabsTrigger>
          </TabsList>
          {canCreate && (
            <ManagerLink href={`/${contentType}/create`} data-tour='content-list-create'>
              <Button>
                <Plus />
                Create
              </Button>
            </ManagerLink>
          )}
        </div>
      </Tabs>
      <DeleteCT
        refetch={refetch}
        setDeleteItem={setDeleteItem}
        ct={contentType}
        item={deleteItem}
        mode='trash'
      />
      <DeleteCT
        refetch={refetch}
        setDeleteItem={setPermanentDeleteItem}
        ct={contentType}
        item={permanentDeleteItem}
        mode='delete'
      />
      <div data-tour='content-list-table'>
        <DataTable
          columns={columns({
            fields: fields || [],
            contentType,
            getTranslation,
            setDeleteItem,
            setPermanentDeleteItem,
            setRestoreItem,
            isTrash,
            hasPermissions,
            hasAnyPermission,
          })}
          data={items as object[]}
        />
      </div>
      {restoreItem ? (
        <div className='flex items-center justify-end gap-2 rounded-md border p-3'>
          <span className='text-muted-foreground text-sm'>
            Restore selected item?
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setRestoreItem(null)}
          >
            Cancel
          </Button>
          <Button
            size='sm'
            loading={restoreMutation.isPending}
            onClick={() => void restore()}
          >
            <RotateCcw />
            Restore
          </Button>
        </div>
      ) : null}
      <div className='mt-6'>
        <PaginationController
          setPage={setPage}
          page={page}
          totalItems={totalItems}
          itemsPerPage={10}
        />
      </div>
    </div>
  )
}
export default ListContents
