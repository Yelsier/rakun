'use client'

import { useState } from 'react'

import { columns, type ManagerUserRecord } from './columns'
import CreateUser from './create'
import DeleteUser from './delete'
import EditUser from './edit'

import { useManagerQuery } from '@/client/react'
import Loading from '@/components/loading'
import { PaginationController } from '@/components/PaginationController'
import { DataTable } from '@/components/ui/data-table'
import UnauthorizedMessage from '@/components/unauthorized'
import { useSession } from '@/state/session'

export function ManagerUsersScreen() {
  const [page, setPage] = useState(1)
  const [edit, setEdit] = useState<ManagerUserRecord | null>(null)
  const [deleteUser, setDeleteUser] = useState<ManagerUserRecord | null>(null)
  const listQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'ManagerUser',
      query: { options: { limit: 10, page } },
    },
  })
  const { hasPermissions, hasAnyPermission } = useSession()

  if (!hasPermissions(['manager.users.readAny'])) {
    return <UnauthorizedMessage neededPermission={['manager.users.readAny']} />
  }

  if (!listQuery.data) {
    return <Loading />
  }

  return (
    <div className='container mx-auto flex flex-col items-start gap-6 px-4 py-10'>
      {hasPermissions(['manager.users.updateAny']) ? (
        <div className='self-end'>
          <CreateUser refetch={() => void listQuery.refetch()} />
        </div>
      ) : null}
      <EditUser
        refetch={() => void listQuery.refetch()}
        setEdit={setEdit}
        defaultValues={edit}
      />
      <DeleteUser
        refetch={() => void listQuery.refetch()}
        setDeleteUser={setDeleteUser}
        user={deleteUser}
      />
      <DataTable
        columns={columns({
          setEdit,
          setDeleteUser,
          hasPermissions,
          hasAnyPermission,
        })}
        data={listQuery.data.items as ManagerUserRecord[]}
      />
      <PaginationController
        page={page}
        setPage={setPage}
        totalItems={listQuery.data.totalItems}
        itemsPerPage={10}
      />
    </div>
  )
}
