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

export type RobotsRuleManager = {
  _id: string
  name: string
  enabled: boolean
  directive: 'allow' | 'disallow' | 'crawlDelay' | 'sitemap' | 'host' | 'comment'
  userAgent: string
  path?: string
  value?: string
  crawlDelay?: number
  order: number
  createdBy?: string
}

export const columns = ({
  onEdit,
  onDelete,
  canEditItem,
  canDeleteItem,
}: {
  onEdit: (item: RobotsRuleManager) => void
  onDelete: (item: RobotsRuleManager) => void
  canEditItem: (item: RobotsRuleManager) => boolean
  canDeleteItem: (item: RobotsRuleManager) => boolean
}): ColumnDef<RobotsRuleManager>[] => [
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
    accessorKey: 'order',
    header: () => <span className='ml-2'>Order</span>,
    cell: ({ row }) => <span className='ml-2'>{row.original.order}</span>,
  },
  {
    accessorKey: 'name',
    header: () => <span className='ml-2'>Name</span>,
    cell: ({ row }) => <span className='ml-2'>{row.original.name}</span>,
  },
  {
    accessorKey: 'directive',
    header: () => <span className='ml-2'>Directive</span>,
    cell: ({ row }) => <span className='ml-2'>{row.original.directive}</span>,
  },
  {
    accessorKey: 'userAgent',
    header: () => <span className='ml-2'>User-agent</span>,
    cell: ({ row }) => <span className='ml-2 font-mono text-xs'>{row.original.userAgent}</span>,
  },
  {
    id: 'target',
    header: () => <span className='ml-2'>Target</span>,
    cell: ({ row }) => (
      <span className='ml-2 font-mono text-xs'>
        {row.original.directive === 'crawlDelay'
          ? row.original.crawlDelay
          : row.original.path || row.original.value || '-'}
      </span>
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
            {canEditItem(item) ? (
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit />
                Edit
              </DropdownMenuItem>
            ) : null}
            {canDeleteItem(item) ? (
              <DropdownMenuItem
                onClick={() => onDelete(item)}
                className='text-destructive'
              >
                <Trash className='text-destructive' />
                Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
