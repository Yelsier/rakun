'use client'

import type { Permission } from '@rakun/core/client'
import type { ColumnDef } from '@tanstack/react-table'
import { Edit, MoreHorizontal, Trash } from 'lucide-react'

import { ManagerLink } from '@/link'
import IDColumn from '@/components/IDColumnt'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ManagerRoleRecord = {
  _id: string
  name: string
  permissions?: string[]
}

export const columns = ({
  setDelete,
  hasPermissions,
  hasAnyPermission,
}: {
  setDelete: (role: ManagerRoleRecord | null) => void
  hasPermissions: (permissions: Permission[]) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
}): ColumnDef<ManagerRoleRecord>[] => [
  {
    accessorKey: '_id',
    header: () => <span className='ml-2'>ID</span>,
    cell: ({ row }) => <IDColumn _id={row.getValue('_id') as string} />,
  },
  {
    accessorKey: 'name',
    header: () => <span className='ml-2'>Name</span>,
    cell: ({ row }) => <span className='ml-2'>{row.getValue('name')}</span>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const role = row.original
      return (
        <DropdownMenu>
          {hasAnyPermission([
            'manager.roles.updateAny',
            'manager.roles.deleteAny',
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
            {hasPermissions(['manager.roles.deleteAny']) && (
              <DropdownMenuItem
                className='text-destructive'
                onClick={() => setDelete(role)}
              >
                <Trash className='text-destructive' />
                Delete {role.name}
              </DropdownMenuItem>
            )}
            {hasPermissions(['manager.roles.updateAny']) && (
              <DropdownMenuItem asChild>
                <ManagerLink href={`/settings/user-roles/${role._id}`}>
                  <Edit />
                  Edit {role.name}
                </ManagerLink>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
