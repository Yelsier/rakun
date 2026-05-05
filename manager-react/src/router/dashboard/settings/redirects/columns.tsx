'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Check, Edit, MoreHorizontal, Trash, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
}: {
  onEdit: (item: RedirectManager) => void
  onDelete: (item: RedirectManager) => void
  canEditItem: (item: RedirectManager) => boolean
  canDeleteItem: (item: RedirectManager) => boolean
}): ColumnDef<RedirectManager>[] => {
  return [
    {
      accessorKey: 'enabled',
      header: () => <span className='ml-2'>Enabled</span>,
      cell: ({ row }) => (
        <span className='ml-2 flex items-center'>
          {row.original.enabled ? (
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
      accessorKey: 'name',
      header: () => <span className='ml-2'>Name</span>,
      cell: ({ row }) => <span className='ml-2'>{row.original.name}</span>,
    },
    {
      accessorKey: 'sourcePath',
      header: () => <span className='ml-2'>From</span>,
      cell: ({ row }) => (
        <span className='ml-2 font-mono text-xs'>{row.original.sourcePath}</span>
      ),
    },
    {
      accessorKey: 'destinationPath',
      header: () => <span className='ml-2'>To</span>,
      cell: ({ row }) => (
        <span className='ml-2 font-mono text-xs'>
          {row.original.destinationPath}
        </span>
      ),
    },
    {
      accessorKey: 'statusMode',
      header: () => <span className='ml-2'>Status</span>,
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
      header: () => <span className='ml-2'>Function</span>,
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
                <span className='sr-only'>Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {canEditItem(item) && (
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Edit />
                  Edit
                </DropdownMenuItem>
              )}
              {canDeleteItem(item) && (
                <DropdownMenuItem
                  onClick={() => onDelete(item)}
                  className='text-destructive'
                >
                  <Trash className='text-destructive' />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

