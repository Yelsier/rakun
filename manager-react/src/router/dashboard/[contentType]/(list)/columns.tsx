'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Copy, Edit, MoreHorizontal, RotateCcw, Trash } from 'lucide-react'
import type {
  MaybeTranslatableValue,
  MentionUser,
  Permission,
} from '@rakun-kit/core/client'

import IDColumn from '../../../../components/IDColumnt'

import { BooleanIndicator } from '@/components/boolean-indicator'
import { UserAvatar } from '@/components/user-avatar'
import { ManagerLink } from '@/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  setPermanentDeleteItem,
  setRestoreItem,
  onDuplicateItem,
  duplicatingItemId,
  enableSelection,
  showVisibility,
  showVariantCount,
  creatorsById,
  currentUserId,
  isTrash,
  hasPermissions,
}: {
  fields: string[]
  contentType: string
  getTranslation: <T>(object: MaybeTranslatableValue<T>) => T
  setDeleteItem: (item: { _id: string } | null) => void
  setPermanentDeleteItem: (item: { _id: string } | null) => void
  setRestoreItem: (item: Record<string, unknown> | null) => void
  onDuplicateItem: (item: Record<string, unknown>) => void
  duplicatingItemId: string | null
  enableSelection: boolean
  showVisibility: boolean
  showVariantCount: boolean
  creatorsById: ReadonlyMap<string, MentionUser>
  currentUserId: string
  isTrash: boolean
  hasPermissions: (permissions: Permission[]) => boolean
}): ColumnDef<object>[] => {
  type DocumentVisibility = 'draft' | 'hidden' | 'published' | 'trash'

  const visibilityStyles: Record<DocumentVisibility, string> = {
    draft: 'border-blue-500/70 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    hidden: 'border-purple-500/70 bg-purple-500/10 text-purple-700 dark:text-purple-300',
    published: 'border-primary/70 bg-primary/10 text-primary',
    trash: 'border-destructive/70 bg-destructive/10 text-destructive',
  }

  const getVisibility = (item: Record<string, unknown>): DocumentVisibility => {
    if (isTrash || item._trashed === true || item._visibility === 'trash') {
      return 'trash'
    }

    if (
      item._visibility === 'draft' ||
      item._visibility === 'hidden' ||
      item._visibility === 'published'
    ) {
      return item._visibility
    }

    return 'published'
  }

  const selectionColumn = {
    id: 'select',
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  } satisfies ColumnDef<object>

  return [
    ...(enableSelection ? [selectionColumn] : []),
    {
      accessorKey: '_id',
      header: () => <span className="ml-2">ID</span>,
      cell: ({ row }) => {
        const id = row.getValue('_id') as string
        return <IDColumn _id={id} />
      },
    },
    ...(showVisibility
      ? [
          {
            id: 'visibility',
            header: () => <span className="ml-2">Status</span>,
            cell: ({ row }) => {
              const visibility = getVisibility(row.original as Record<string, unknown>)

              return (
                <Badge
                  variant="outline"
                  className={`ml-2 capitalize ${visibilityStyles[visibility]}`}
                >
                  {visibility}
                </Badge>
              )
            },
          } satisfies ColumnDef<object>,
        ]
      : []),
    ...fields.map(
      (key, i) =>
        ({
          accessorKey: key,
          header: () => <span className="ml-2">{decodeCamelCase(key.split('.').shift()!)}</span>,
          cell: ({ row }) => {
            const value = key
              .split('.')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .reduce((acc, key) => acc?.[key], row.original as any)

            if (typeof value === 'boolean') {
              return <BooleanIndicator value={value} className="ml-2" />
            }

            if (i === 0 && typeof getTranslation(value) === 'string') {
              return (
                <Button variant={'link'} className="p-0">
                  <ManagerLink
                    href={`/${contentType}/${row.getValue('_id')}`}
                    className="flex items-center ml-2"
                  >
                    {getTranslation(value)}
                  </ManagerLink>
                </Button>
              )
            }

            return <span className="flex items-center ml-2">{getTranslation(value)}</span>
          },
        }) as ColumnDef<object>
    ),
    {
      accessorKey: 'createdBy',
      header: () => <span className="ml-2">Created by</span>,
      cell: ({ row }) => {
        const creatorId = row.getValue('createdBy')
        if (typeof creatorId !== 'string') {
          return <span className="ml-2 text-muted-foreground">-</span>
        }

        const creator = creatorsById.get(creatorId)
        const creatorName = creator?.name?.trim() || creator?.user || 'Unknown user'

        return (
          <span className="ml-2 flex items-center gap-2">
            <UserAvatar
              name={creatorName}
              avatar={creator?.avatar}
              className="size-6"
              fallbackClassName="text-xs"
            />
            <span>{creatorName}</span>
          </span>
        )
      },
    },
    ...(showVariantCount
      ? [
          {
            accessorKey: '_variantCount',
            header: () => <span className="ml-2">Variants</span>,
            cell: ({ row }) => (
              <span className="ml-2">
                {Number(row.getValue('_variantCount') ?? 0)}
              </span>
            ),
          } satisfies ColumnDef<object>,
        ]
      : []),
    {
      id: 'actions',
      cell: ({ row }) => {
        const id = row.getValue('_id') as string
        const isDuplicating = duplicatingItemId === id
        const item = row.original as Record<string, unknown>
        const createdBy = item.createdBy
        const creatorId =
          typeof createdBy === 'string'
            ? createdBy
            : createdBy &&
                typeof createdBy === 'object' &&
                typeof (createdBy as { _id?: unknown })._id === 'string'
              ? (createdBy as { _id: string })._id
              : null
        const ownsItem = creatorId === currentUserId
        const hasOwnPermission = hasPermissions([
          `content.${contentType}.own` as Permission,
        ])
        const canReadAny = hasPermissions([
          `content.${contentType}.readAny` as Permission,
        ])
        const canUpdate =
          hasPermissions([
            `content.${contentType}.updateAny` as Permission,
          ]) ||
          (ownsItem && hasOwnPermission)
        const canDelete =
          hasPermissions([
            `content.${contentType}.deleteAny` as Permission,
          ]) ||
          (ownsItem && hasOwnPermission)
        const canDuplicate =
          hasOwnPermission && (ownsItem || canReadAny)
        const hasActions = isTrash
          ? canUpdate || canDelete
          : canUpdate || canDelete || canDuplicate

        return (
          <>
            <DropdownMenu>
              {hasActions && (
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
              )}
              <DropdownMenuContent align="end">
                {isTrash && canUpdate && (
                  <DropdownMenuItem
                    onClick={() => setRestoreItem(item)}
                  >
                    <RotateCcw />
                    Restore
                  </DropdownMenuItem>
                )}
                {isTrash && canDelete && (
                  <DropdownMenuItem
                    onClick={() => setPermanentDeleteItem({ _id: id })}
                    className="text-destructive"
                  >
                    <Trash className="text-destructive" />
                    Delete permanently
                  </DropdownMenuItem>
                )}
                {!isTrash && canDelete && (
                  <DropdownMenuItem
                    onClick={() => setDeleteItem({ _id: id })}
                    className="text-destructive"
                  >
                    <Trash className="text-destructive" />
                    Move to trash
                  </DropdownMenuItem>
                )}
                {!isTrash && canDuplicate && (
                  <DropdownMenuItem
                    disabled={isDuplicating}
                    onClick={() => onDuplicateItem(item)}
                  >
                    <Copy />
                    {isDuplicating ? 'Duplicating...' : 'Duplicate'}
                  </DropdownMenuItem>
                )}
                {!isTrash && canUpdate && (
                  <DropdownMenuItem asChild>
                    <ManagerLink
                      href={`/${contentType}/${id}`}
                      className="flex w-full items-center gap-2"
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
