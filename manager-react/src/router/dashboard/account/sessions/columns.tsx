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
import type { useTranslations } from '@/i18n'

type Translate = ReturnType<typeof useTranslations>

export const columns = ({
  current,
  setDeleteSession,
  t,
}: {
  current: string
  setDeleteSession: (session: string | null) => void
  t: Translate
}): ColumnDef<AccountInfoOutput['sessions'][number]>[] => [
  {
    id: 'current',
    header: () => <span className='ml-2'>{t('account.sessions.current')}</span>,
    cell: ({ row }) => {
      const token = row.getValue('token') as string
      return <BooleanIndicator value={token === current} />
    },
  },
  {
    accessorKey: 'createdAt',
    header: () => <span className='ml-2'>{t('account.sessions.createdAt')}</span>,
    cell: ({ row }) => {
      const createdAt = row.getValue('createdAt') as Date | undefined
      return (
        <span className='ml-2'>
          {createdAt ? formatDate(createdAt) : t('common.unknown')}
        </span>
      )
    },
  },
  {
    accessorKey: 'expiresAt',
    header: () => <span className='ml-2'>{t('account.sessions.expiresAt')}</span>,
    cell: ({ row }) => (
      <span className='ml-2'>
        {formatDate(row.getValue('expiresAt') as Date)}
      </span>
    ),
  },
  {
    accessorKey: 'token',
    header: () => <span className='ml-2'>{t('account.sessions.token')}</span>,
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
              <span className='sr-only'>{t('common.openMenu')}</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem
              className='text-destructive'
              onClick={() => setDeleteSession(token)}
            >
              <Trash className='text-destructive' />
              {t('account.sessions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
