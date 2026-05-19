'use client'

import { useState } from 'react'

import { ManagerLink } from '@/link'
import { columns, type ManagerRoleRecord } from './columns'
import { DeleteRole } from './delete'

import { useManagerQuery } from '@/client/react'
import Loading from '@/components/loading'
import { PaginationController } from '@/components/PaginationController'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { useSession } from '@/state/session'

export const ManagerSettingsUserRolesScreen = () => {
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [deleteRole, setDeleteRole] = useState<ManagerRoleRecord | null>(null)
  const listQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'ManagerRole',
      query: { options: { limit: itemsPerPage, page } },
    },
  })
  const { hasPermissions, hasAnyPermission } = useSession()

  if (!listQuery.data) {
    return <Loading />
  }

  return (
    <div className='container mx-auto flex flex-col items-start gap-6 py-10'>
      {hasPermissions(['manager.roles.updateAny']) && (
        <Button asChild className='self-end'>
          <ManagerLink href='/settings/user-roles/create'>
            Add Role
          </ManagerLink>
        </Button>
      )}
      <DeleteRole
        role={deleteRole}
        refetch={() => void listQuery.refetch()}
        setDelete={setDeleteRole}
      />
      <DataTable
        columns={columns({
          setDelete: setDeleteRole,
          hasPermissions,
          hasAnyPermission,
        })}
        data={listQuery.data.items as ManagerRoleRecord[]}
      />
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
