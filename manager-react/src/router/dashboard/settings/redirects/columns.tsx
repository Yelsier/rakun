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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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

const TruncatedCell = ({
  value,
  mono = false,
  withTooltip = false,
}: {
  value: string
  mono?: boolean
  withTooltip?: boolean
}) => {
  const className = mono
    ? 'inline-block max-w-full truncate align-bottom font-mono text-xs'
    : 'inline-block max-w-full truncate align-bottom text-sm'

  const text = <span className={className}>{value}</span>

  return (
    <div className='ml-2 min-w-0 max-w-full'>
      {withTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{text}</TooltipTrigger>
          <TooltipContent
            side='top'
            align='start'
            sideOffset={6}
            className='max-w-md break-all text-left leading-relaxed'
          >
            {value}
          </TooltipContent>
        </Tooltip>
      ) : (
        text
      )}
    </div>
  )
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
      size: 88,
      header: () => <span className='ml-2'>{t('common.enabled')}</span>,
      cell: ({ row }) => (
        <div className='ml-2'>
          <BooleanIndicator value={row.original.enabled} />
        </div>
      ),
    },
    {
      accessorKey: 'sourcePath',
      size: 260,
      header: () => <span className='ml-2'>{t('common.from')}</span>,
      cell: ({ row }) => <TruncatedCell value={row.original.sourcePath} mono />,
    },
    {
      accessorKey: 'destinationPath',
      size: 260,
      header: () => <span className='ml-2'>{t('common.to')}</span>,
      cell: ({ row }) => (
        <TruncatedCell value={row.original.destinationPath} mono />
      ),
    },
    {
      accessorKey: 'name',
      size: 220,
      header: () => <span className='ml-2'>{t('fields.name')}</span>,
      cell: ({ row }) => <TruncatedCell value={row.original.name} withTooltip />,
    },
    {
      accessorKey: 'statusMode',
      size: 88,
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
      size: 140,
      header: () => <span className='ml-2'>{t('common.function')}</span>,
      cell: ({ row }) => (
        <TruncatedCell value={row.original.functionName} />
      ),
    },
    {
      id: 'actions',
      size: 56,
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
