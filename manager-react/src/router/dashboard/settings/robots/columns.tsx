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
  t,
}: {
  onEdit: (item: RobotsRuleManager) => void
  onDelete: (item: RobotsRuleManager) => void
  canEditItem: (item: RobotsRuleManager) => boolean
  canDeleteItem: (item: RobotsRuleManager) => boolean
  t: Translate
}): ColumnDef<RobotsRuleManager>[] => [
  {
    accessorKey: 'enabled',
    header: () => <span className='ml-2'>{t('common.enabled')}</span>,
    cell: ({ row }) => <BooleanIndicator value={row.original.enabled} />,
  },
  {
    accessorKey: 'order',
    header: () => <span className='ml-2'>{t('common.order')}</span>,
    cell: ({ row }) => <span className='ml-2'>{row.original.order}</span>,
  },
  {
    accessorKey: 'name',
    header: () => <span className='ml-2'>{t('fields.name')}</span>,
    cell: ({ row }) => <span className='ml-2'>{row.original.name}</span>,
  },
  {
    accessorKey: 'directive',
    header: () => <span className='ml-2'>{t('settings.robots.directive')}</span>,
    cell: ({ row }) => <span className='ml-2'>{row.original.directive}</span>,
  },
  {
    accessorKey: 'userAgent',
    header: () => <span className='ml-2'>{t('settings.robots.userAgent')}</span>,
    cell: ({ row }) => <span className='ml-2 font-mono text-xs'>{row.original.userAgent}</span>,
  },
  {
    id: 'target',
    header: () => <span className='ml-2'>{t('settings.robots.target')}</span>,
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
              <span className='sr-only'>{t('common.openMenu')}</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {canEditItem(item) ? (
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit />
                {t('common.edit')}
              </DropdownMenuItem>
            ) : null}
            {canDeleteItem(item) ? (
              <DropdownMenuItem
                onClick={() => onDelete(item)}
                className='text-destructive'
              >
                <Trash className='text-destructive' />
                {t('common.delete')}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
