'use client'

import type { Permission } from '@rakun-kit/core/client'
import type { ColumnDef } from '@tanstack/react-table'
import { Edit, MoreHorizontal, Trash } from 'lucide-react'

import { BooleanIndicator } from '@/components/boolean-indicator'
import IDColumn from '@/components/IDColumnt'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ManagerUserRecord = {
  _id: string
  user: string
  email: string
  role?: { _id: string; name: string } | null
  twoFactorEnabled?: boolean
}

export const columns = ({
  setEdit,
  setDeleteUser,
  hasPermissions,
  hasAnyPermission,
}: {
  setEdit: (user: ManagerUserRecord) => void
  setDeleteUser: (user: ManagerUserRecord | null) => void
  hasPermissions: (permissions: Permission[]) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
}): ColumnDef<ManagerUserRecord>[] => [
  {
    accessorKey: '_id',
    header: () => <span className='ml-2'>ID</span>,
    cell: ({ row }) => <IDColumn _id={row.getValue('_id') as string} />,
  },
  {
    accessorKey: 'user',
    header: () => <span className='ml-2'>Username</span>,
    cell: ({ row }) => <span className='ml-2'>{row.getValue('user')}</span>,
  },
  {
    accessorKey: 'email',
    header: () => <span className='ml-2'>Email</span>,
    cell: ({ row }) => <span className='ml-2'>{row.getValue('email')}</span>,
  },
  {
    accessorKey: 'role',
    header: () => <span className='ml-2'>Role</span>,
    cell: ({ row }) => (
      <span className='ml-2'>{row.original.role?.name ?? '-'}</span>
    ),
  },
  {
    accessorKey: 'twoFactorEnabled',
    header: () => <span className='ml-2'>Two Factor Enabled</span>,
    cell: ({ row }) => (
      <BooleanIndicator value={Boolean(row.getValue('twoFactorEnabled'))} />
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original

      return (
        <DropdownMenu>
          {hasAnyPermission([
            'manager.users.updateAny',
            'manager.users.deleteAny',
          ]) && (
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='m-auto flex h-8 w-8 items-center justify-center p-0!'
              >
                <span className='sr-only'>Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
          )}
          <DropdownMenuContent align='end'>
            {hasPermissions(['manager.users.deleteAny']) && (
              <DropdownMenuItem
                className='text-destructive'
                onClick={() => setDeleteUser(user)}
              >
                <Trash className='text-destructive' />
                Delete {user.user}
              </DropdownMenuItem>
            )}
            {hasPermissions(['manager.users.updateAny']) && (
              <DropdownMenuItem onClick={() => setEdit(user)}>
                <Edit />
                Edit {user.user}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
