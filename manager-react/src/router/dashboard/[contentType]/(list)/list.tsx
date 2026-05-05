'use client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Permission } from '@rakun/core/client'

import { columns } from './columns'
import DeleteCT from './delete'

import { ManagerLink } from '@/link'
import Loading from '@/components/loading'
import { PaginationController } from '@/components/PaginationController'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { useLanguage } from '@/state/language'
import { useTRPC } from '@/components/trpc-provider'
import { useSession } from '@/state/session'

const ListContents: React.FC<{ contentType: string; fields?: string[] }> = ({
  contentType,
  fields,
}) => {
  const [page, setPage] = useState(1)
  const [deleteItem, setDeleteItem] = useState<{ _id: string } | null>(null)
  const { getTranslation } = useLanguage()
  const trpc = useTRPC()
  const { hasAnyPermission, hasPermissions } = useSession()
  const { data, refetch } = useQuery(
    trpc.manager.list.queryOptions({
      contentType,
      query: {
        options: { limit: 10, page, fields: fields ?? undefined },
      },
    }),
  )

  if (!data) {
    return <Loading />
  }

  const typedData = data as { totalItems: number; items: object[] }
  const { totalItems, items } = typedData

  return (
    <div className='flex flex-col gap-6'>
      {hasAnyPermission([
        `content.${contentType}.own` as Permission,
        `content.${contentType}.updateAny` as Permission,
      ]) && (
        <ManagerLink
          href={`/${contentType}/create`}
          className='self-end'
        >
          <Button>Create</Button>
        </ManagerLink>
      )}
      <DeleteCT
        refetch={refetch}
        setDeleteItem={setDeleteItem}
        ct={contentType}
        item={deleteItem}
      />
      <DataTable
        columns={columns({
          fields: fields || [],
          contentType,
          getTranslation,
          setDeleteItem,
          hasPermissions,
          hasAnyPermission,
        })}
        data={items as object[]}
      />
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
