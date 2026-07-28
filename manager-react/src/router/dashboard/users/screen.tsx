'use client'

import { keepPreviousData } from '@tanstack/react-query'
import { startTransition, useCallback, useState, type Dispatch, type SetStateAction } from 'react'

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
import { useManagerUsers } from '@/state/users'

export function ManagerUsersScreen() {
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [edit, setEdit] = useState<ManagerUserRecord | null>(null)
  const [deleteUser, setDeleteUser] = useState<ManagerUserRecord | null>(null)
  const listQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'ManagerUser',
      query: { options: { limit: itemsPerPage, page } },
    },
    placeholderData: keepPreviousData,
  })
  const { hasPermissions, hasAnyPermission } = useSession()
  const { refetch: refetchManagerUsers } = useManagerUsers()
  const refetchUsers = () => {
    void Promise.all([listQuery.refetch(), refetchManagerUsers()])
  }

  const setPageTransition = useCallback<Dispatch<SetStateAction<number>>>((value) => {
    startTransition(() => {
      setPage(value)
    })
  }, [])

  const setItemsPerPageTransition = useCallback<Dispatch<SetStateAction<number>>>((value) => {
    startTransition(() => {
      setItemsPerPage(value)
    })
  }, [])

  if (!hasPermissions(['content.ManagerUser.readAny'])) {
    return <UnauthorizedMessage neededPermission={['content.ManagerUser.readAny']} />
  }

  if (listQuery.isPending && !listQuery.data) {
    return <Loading />
  }

  if (!listQuery.data) {
    return <Loading />
  }

  return (
    <div className="container mx-auto flex flex-col items-start gap-6 px-4 py-10">
      {hasPermissions(['content.ManagerUser.updateAny']) ? (
        <div className="self-end" data-tour="users-create">
          <CreateUser refetch={refetchUsers} />
        </div>
      ) : null}
      <EditUser
        refetch={refetchUsers}
        setEdit={setEdit}
        defaultValues={edit}
      />
      <DeleteUser
        refetch={refetchUsers}
        setDeleteUser={setDeleteUser}
        user={deleteUser}
      />
      <div className="w-full" data-tour="users-table">
        <DataTable
          columns={columns({
            setEdit,
            setDeleteUser,
            hasPermissions,
            hasAnyPermission,
          })}
          data={listQuery.data.items as ManagerUserRecord[]}
        />
      </div>
      <PaginationController
        page={page}
        setPage={setPageTransition}
        totalItems={listQuery.data.totalItems}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPageTransition}
      />
    </div>
  )
}
