'use client'

import type { AccountInfoOutput } from '@rakun-kit/core/contracts'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Trash } from 'lucide-react'

import { BooleanIndicator } from '@/components/boolean-indicator'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate } from '@/helpers/formatDate'

export const columns = ({
  current,
  setDeleteSession,
}: {
  current: string
  setDeleteSession: (session: string | null) => void
}): ColumnDef<AccountInfoOutput['sessions'][number]>[] => [
  {
    id: 'current',
    header: () => <span className='ml-2'>Current session</span>,
    cell: ({ row }) => {
      const token = row.getValue('token') as string
      return <BooleanIndicator value={token === current} />
    },
  },
  {
    accessorKey: 'createdAt',
    header: () => <span className='ml-2'>Created At</span>,
    cell: ({ row }) => {
      const createdAt = row.getValue('createdAt') as Date | undefined
      return (
        <span className='ml-2'>{createdAt ? formatDate(createdAt) : 'Unknown'}</span>
      )
    },
  },
  {
    accessorKey: 'expiresAt',
    header: () => <span className='ml-2'>Expires At</span>,
    cell: ({ row }) => (
      <span className='ml-2'>
        {formatDate(row.getValue('expiresAt') as Date)}
      </span>
    ),
  },
  {
    accessorKey: 'token',
    header: () => <span className='ml-2'>Token</span>,
    cell: ({ row }) => <span className='ml-2'>{row.getValue('token')}</span>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const token = row.getValue('token') as string

      if (token === current) return null

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
            <DropdownMenuItem
              className='text-destructive'
              onClick={() => setDeleteSession(token)}
            >
              <Trash className='text-destructive' />
              Delete session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
