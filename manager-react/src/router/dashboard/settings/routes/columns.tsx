'use client'

import type { MaybeTranslatableValue, Permission } from '@rakun-kit/core/client'
import type { ColumnDef } from '@tanstack/react-table'
import { Edit, MoreHorizontal, Settings } from 'lucide-react'

import { BooleanIndicator } from '@/components/boolean-indicator'
import IDColumn from '@/components/IDColumnt'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ManagerRouteRecord = {
  _id: string
  hasPage?: boolean
  dynamic?: boolean
  contentType?: string
  field?: string
  basePath?: MaybeTranslatableValue<string>
  parent?: { _id?: string } | null
  parentRelationField?: string
}

export const columns = ({
  getTranslation,
  setEdit,
  hasPermissions,
  canEditLayoutModules,
  onEditLayoutModules,
}: {
  setEdit: (route: ManagerRouteRecord) => void
  getTranslation: <T>(object: MaybeTranslatableValue<T>) => T
  hasPermissions: (permissions: Permission[]) => boolean
  canEditLayoutModules?: (route: ManagerRouteRecord) => boolean
  onEditLayoutModules?: (route: ManagerRouteRecord) => void
}): ColumnDef<ManagerRouteRecord>[] => [
  {
    accessorKey: '_id',
    header: () => <span className="ml-2">ID</span>,
    cell: ({ row }) => <IDColumn _id={row.getValue('_id') as string} />,
  },
  {
    accessorKey: 'hasPage',
    header: () => <span className="ml-2">Has page</span>,
    cell: ({ row }) => <BooleanIndicator value={Boolean(row.getValue('hasPage'))} />,
  },
  {
    accessorKey: 'dynamic',
    header: () => <span className="ml-2">Dynamic</span>,
    cell: ({ row }) => <BooleanIndicator value={Boolean(row.getValue('dynamic'))} />,
  },
  {
    accessorKey: 'contentType',
    header: () => <span className="ml-2">Content Type</span>,
    cell: ({ row }) => <span className="ml-2">{row.getValue('contentType')}</span>,
  },
  {
    accessorKey: 'field',
    header: () => <span className="ml-2">Field</span>,
    cell: ({ row }) => <span className="ml-2">{row.getValue('field')}</span>,
  },
  {
    accessorKey: 'basePath',
    header: () => <span className="ml-2">Base Path</span>,
    cell: ({ row }) => (
      <span className="ml-2">
        {getTranslation(row.original.basePath as MaybeTranslatableValue<string>)}
      </span>
    ),
  },
  {
    accessorKey: 'parent',
    header: () => <span className="ml-2">Parent</span>,
    cell: ({ row }) =>
      row.original.parent?._id ? <IDColumn _id={row.original.parent._id} /> : null,
  },
  {
    accessorKey: 'parentRelationField',
    header: () => <span className="ml-2">Parent Relation Field</span>,
    cell: ({ row }) => <span className="ml-2">{row.original.parentRelationField}</span>,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        {hasPermissions(['manager.routes.updateAny']) && (
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="m-auto flex h-8 w-8 items-center justify-center p-0!"
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent align="end">
          {hasPermissions(['manager.routes.updateAny']) && (
            <DropdownMenuItem onClick={() => setEdit(row.original)}>
              <Edit />
              Edit
            </DropdownMenuItem>
          )}
          {hasPermissions(['manager.routes.updateAny']) && canEditLayoutModules?.(row.original) && (
            <DropdownMenuItem onClick={() => onEditLayoutModules?.(row.original)}>
              <Settings />
              Edit layout modules
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]
