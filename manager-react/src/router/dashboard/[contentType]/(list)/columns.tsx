'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Check, Edit, MoreHorizontal, Trash, X } from 'lucide-react'
import type { MaybeTranslatableValue, Permission } from '@rakun/core/client'

import IDColumn from '../../../../components/IDColumnt'

import { ManagerLink } from '@/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { decodeCamelCase } from '@/helpers/decode-camel-case'

export const columns = ({
  fields,
  contentType,
  getTranslation,
  setDeleteItem,
  hasPermissions,
  hasAnyPermission,
}: {
  fields: string[]
  contentType: string
  getTranslation: <T>(object: MaybeTranslatableValue<T>) => T
  setDeleteItem: (item: { _id: string } | null) => void
  hasPermissions: (permissions: Permission[]) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
}): ColumnDef<object>[] => {
  return [
    {
      accessorKey: '_id',
      header: () => <span className='ml-2'>ID</span>,
      cell: ({ row }) => {
        const id = row.getValue('_id') as string
        return <IDColumn _id={id} />
      },
    },
    ...fields.map(
      (key, i) =>
        ({
          accessorKey: key,
          header: () => (
            <span className='ml-2'>
              {decodeCamelCase(key.split('.').shift()!)}
            </span>
          ),
          cell: ({ row }) => {
            const value = key
              .split('.')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .reduce((acc, key) => acc?.[key], row.original as any)

            if (typeof value === 'boolean') {
              return (
                <span className='flex items-center ml-2'>
                  {value ? (
                    <div className='bg-green-400 text-background rounded-full p-1'>
                      <Check size={12} />
                    </div>
                  ) : (
                    <div className='bg-destructive text-background rounded-full p-1'>
                      <X size={12} />
                    </div>
                  )}
                </span>
              )
            }

            if (i === 0 && typeof getTranslation(value) === 'string') {
              return (
                <Button variant={'link'} className='p-0'>
                  <ManagerLink
                    href={`/${contentType}/${row.getValue('_id')}`}
                    className='flex items-center ml-2'
                  >
                    {getTranslation(value)}
                  </ManagerLink>
                </Button>
              )
            }

            return (
              <span className='flex items-center ml-2'>
                {getTranslation(value)}
              </span>
            )
          },
        }) as ColumnDef<object>,
    ),
    {
      id: 'actions',
      cell: ({ row }) => {
        return (
          <>
            <DropdownMenu>
              {hasAnyPermission([
                `content.${contentType}.deleteAny` as Permission,
                `content.${contentType}.updateAny` as Permission,
              ]) && (
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' className='h-8 w-8 p-0'>
                    <span className='sr-only'>Open menu</span>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
              )}
              <DropdownMenuContent align='end'>
                {hasPermissions([
                  `content.${contentType}.deleteAny` as Permission,
                ]) && (
                  <DropdownMenuItem
                    onClick={() => setDeleteItem({ _id: row.getValue('_id') })}
                    className='text-destructive'
                  >
                    <Trash className='text-destructive' />
                    Delete
                  </DropdownMenuItem>
                )}
                {hasPermissions([
                  `content.${contentType}.updateAny` as Permission,
                ]) && (
                  <DropdownMenuItem asChild>
                    <ManagerLink
                      href={`/${contentType}/${row.getValue('_id')}`}
                      className='flex w-full items-center gap-2'
                    >
                      <Edit />
                      Edit
                    </ManagerLink>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )
      },
    },
  ]
}
