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
import type { useTranslations } from '@/i18n'

type Translate = ReturnType<typeof useTranslations>

export type ManagerUserRecord = {
  _id: string
  name?: string
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
  t,
}: {
  setEdit: (user: ManagerUserRecord) => void
  setDeleteUser: (user: ManagerUserRecord | null) => void
  hasPermissions: (permissions: Permission[]) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  t: Translate
}): ColumnDef<ManagerUserRecord>[] => [
  {
    accessorKey: '_id',
    header: () => <span className='ml-2'>{t('contentList.id')}</span>,
    cell: ({ row }) => <IDColumn _id={row.getValue('_id') as string} />,
  },
  {
    accessorKey: 'name',
    header: () => <span className='ml-2'>{t('fields.name')}</span>,
    cell: ({ row }) => <span className='ml-2'>{row.getValue('name') || '-'}</span>,
  },
  {
    accessorKey: 'user',
    header: () => <span className='ml-2'>{t('common.username')}</span>,
    cell: ({ row }) => <span className='ml-2'>{row.getValue('user')}</span>,
  },
  {
    accessorKey: 'email',
    header: () => <span className='ml-2'>{t('common.email')}</span>,
    cell: ({ row }) => <span className='ml-2'>{row.getValue('email')}</span>,
  },
  {
    accessorKey: 'role',
    header: () => <span className='ml-2'>{t('common.role')}</span>,
    cell: ({ row }) => (
      <span className='ml-2'>{row.original.role?.name ?? '-'}</span>
    ),
  },
  {
    accessorKey: 'twoFactorEnabled',
    header: () => <span className='ml-2'>{t('users.twoFactorEnabled')}</span>,
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
            'content.ManagerUser.updateAny',
            'content.ManagerUser.deleteAny',
          ]) && (
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='m-auto flex h-8 w-8 items-center justify-center p-0!'
              >
                <span className='sr-only'>{t('common.openMenu')}</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
          )}
          <DropdownMenuContent align='end'>
            {hasPermissions(['content.ManagerUser.deleteAny']) && (
              <DropdownMenuItem
                className='text-destructive'
                onClick={() => setDeleteUser(user)}
              >
                <Trash className='text-destructive' />
                {t('common.delete')} {user.user}
              </DropdownMenuItem>
            )}
            {hasPermissions(['content.ManagerUser.updateAny']) && (
              <DropdownMenuItem onClick={() => setEdit(user)}>
                <Edit />
                {t('common.edit')} {user.user}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
