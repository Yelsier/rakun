'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Eye } from 'lucide-react'

import IDColumn from '@/components/IDColumnt'
import { Button } from '@/components/ui/button'
import { ManagerLink } from '@/link'
import type { useTranslations } from '@/i18n'

type Translate = ReturnType<typeof useTranslations>

export type RouteMapRecord = {
  _id: string
  path?: string
  routeId?: string
  contentType?: string
  contentTypeId?: string
}

export const columns = ({ t }: { t: Translate }): ColumnDef<RouteMapRecord>[] => [
  {
    accessorKey: '_id',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        {t('contentList.id')}
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => <IDColumn _id={row.getValue('_id') as string} />,
  },
  {
    accessorKey: 'path',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        {t('common.path')}
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => <span className="ml-2">{row.getValue('path') as string}</span>,
  },
  {
    accessorKey: 'routeId',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        {t('settings.routes.routeId')}
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) =>
      row.getValue('routeId') ? <IDColumn _id={row.getValue('routeId') as string} /> : null,
  },
  {
    accessorKey: 'contentType',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        {t('common.contentType')}
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => <span className="ml-2">{row.getValue('contentType') as string}</span>,
  },
  {
    accessorKey: 'contentTypeId',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        {t('settings.routes.contentTypeId')}
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) =>
      row.getValue('contentTypeId') ? (
        <IDColumn _id={row.getValue('contentTypeId') as string} />
      ) : null,
  },
  {
    accessorKey: 'view',
    header: 'View',
    cell: ({ row }) => {
      const contentType = row.getValue('contentType')
      const itemId = row.getValue('contentTypeId')
      return contentType ? (
        <ManagerLink href={`/${contentType}/${itemId}`}>
          <Button size="icon" variant="outline">
            <Eye className="h-5 w-5" />
          </Button>
        </ManagerLink>
      ) : null
    },
  },
]
