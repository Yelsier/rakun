'use client'

import type { Permission } from '@rakun-kit/core/client'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Edit, MoreHorizontal, Star, Trash, X } from 'lucide-react'

import IDColumn from '@/components/IDColumnt'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ManagerLanguageRecord = {
  _id: string
  code: string
  name: string
  default?: boolean
  parent?: { _id?: string } | null
}

export const columns = ({
  setEdit,
  setDeleteLanguage,
  handleSetDefault,
  languages,
  hasPermissions,
  hasAnyPermission,
}: {
  setEdit: (language: ManagerLanguageRecord) => void
  setDeleteLanguage: (language: ManagerLanguageRecord | null) => void
  handleSetDefault: (languageCode: string) => void
  languages: ManagerLanguageRecord[]
  hasPermissions: (permissions: Permission[]) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
}): ColumnDef<ManagerLanguageRecord>[] => [
  {
    accessorKey: '_id',
    header: () => <span className='ml-2'>ID</span>,
    cell: ({ row }) => <IDColumn _id={row.getValue('_id') as string} />,
  },
  {
    accessorKey: 'default',
    header: () => <span className='ml-2'>Default</span>,
    cell: ({ row }) => (
      <span className='ml-2 flex items-center'>
        {row.getValue('default') ? (
          <div className='rounded-full bg-green-400 p-1 text-background'>
            <Check size={12} />
          </div>
        ) : (
          <div className='rounded-full bg-destructive p-1 text-background'>
            <X size={12} />
          </div>
        )}
      </span>
    ),
  },
  {
    accessorKey: 'code',
    header: () => <span className='ml-2'>Code</span>,
    cell: ({ row }) => <span className='ml-2'>{row.getValue('code')}</span>,
  },
  {
    accessorKey: 'name',
    header: () => <span className='ml-2'>Name</span>,
    cell: ({ row }) => <span className='ml-2'>{row.getValue('name')}</span>,
  },
  {
    accessorKey: 'parent',
    header: () => <span className='ml-2'>Parent</span>,
    cell: ({ row }) => (
      <span className='ml-2'>
        {languages.find((lang) => lang._id === row.original.parent?._id)?.code ?? ''}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const language = row.original

      return (
        <DropdownMenu>
          {hasAnyPermission([
            'manager.languages.updateAny',
            'manager.languages.deleteAny',
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
            {hasPermissions(['manager.languages.updateAny']) && (
              <DropdownMenuItem onClick={() => handleSetDefault(language.code)}>
                <Star />
                Set as default
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {hasPermissions(['manager.languages.deleteAny']) && (
              <DropdownMenuItem
                className='text-destructive'
                onClick={() => setDeleteLanguage(language)}
              >
                <Trash className='text-destructive' />
                Delete {language.name} ({language.code})
              </DropdownMenuItem>
            )}
            {hasPermissions(['manager.languages.updateAny']) && (
              <DropdownMenuItem onClick={() => setEdit(language)}>
                <Edit />
                Edit {language.name} ({language.code})
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

