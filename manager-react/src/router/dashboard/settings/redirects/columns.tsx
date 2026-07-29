'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Edit, MoreHorizontal, Trash } from 'lucide-react'

import { BooleanIndicator } from '@/components/boolean-indicator'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { useTranslations } from '@/i18n'

type Translate = ReturnType<typeof useTranslations>

export type RedirectManager = {
  _id: string
  name: string
  enabled: boolean
  sourcePath: string
  destinationPath: string
  statusMode: '301' | '302' | '307' | '308' | 'custom'
  customStatus?: number
  preserveQuery: boolean
  headerName?: string
  headerMatchMode:
    | 'none'
    | 'exists'
    | 'equals'
    | 'contains'
    | 'startsWith'
    | 'regex'
  headerValue?: string
  functionName: 'none' | 'acceptLanguageToParam' | 'headerValueToParam'
  functionConfig?: string
  createdBy?: string
}

export const columns = ({
  onEdit,
  onDelete,
  canEditItem,
  canDeleteItem,
  t,
}: {
  onEdit: (item: RedirectManager) => void
  onDelete: (item: RedirectManager) => void
  canEditItem: (item: RedirectManager) => boolean
  canDeleteItem: (item: RedirectManager) => boolean
  t: Translate
}): ColumnDef<RedirectManager>[] => {
  return [
    {
      accessorKey: 'enabled',
      header: () => <span className='ml-2'>{t('common.enabled')}</span>,
      cell: ({ row }) => <BooleanIndicator value={row.original.enabled} />,
    },
    {
      accessorKey: 'name',
      header: () => <span className='ml-2'>{t('fields.name')}</span>,
      cell: ({ row }) => <span className='ml-2'>{row.original.name}</span>,
    },
    {
      accessorKey: 'sourcePath',
      header: () => <span className='ml-2'>{t('common.from')}</span>,
      cell: ({ row }) => (
        <span className='ml-2 font-mono text-xs'>{row.original.sourcePath}</span>
      ),
    },
    {
      accessorKey: 'destinationPath',
      header: () => <span className='ml-2'>{t('common.to')}</span>,
      cell: ({ row }) => (
        <span className='ml-2 font-mono text-xs'>
          {row.original.destinationPath}
        </span>
      ),
    },
    {
      accessorKey: 'statusMode',
      header: () => <span className='ml-2'>{t('fields.status')}</span>,
      cell: ({ row }) => (
        <span className='ml-2'>
          {row.original.statusMode === 'custom'
            ? row.original.customStatus || 'custom'
            : row.original.statusMode}
        </span>
      ),
    },
    {
      accessorKey: 'functionName',
      header: () => <span className='ml-2'>{t('common.function')}</span>,
      cell: ({ row }) => (
        <span className='ml-2'>{row.original.functionName}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const item = row.original
        if (!canEditItem(item) && !canDeleteItem(item)) return null

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='m-auto flex h-8 w-8 items-center justify-center p-0!'
              >
                <span className='sr-only'>{t('common.openMenu')}</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {canEditItem(item) && (
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Edit />
                  {t('common.edit')}
                </DropdownMenuItem>
              )}
              {canDeleteItem(item) && (
                <DropdownMenuItem
                  onClick={() => onDelete(item)}
                  className='text-destructive'
                >
                  <Trash className='text-destructive' />
                  {t('common.delete')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
