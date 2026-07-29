'use client'

import type { Permission } from '@rakun-kit/core/client'
import type { ColumnDef } from '@tanstack/react-table'
import { Edit, MoreHorizontal, Star, Trash } from 'lucide-react'

import { BooleanIndicator } from '@/components/boolean-indicator'
import IDColumn from '@/components/IDColumnt'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { useTranslations } from '@/i18n'

type Translate = ReturnType<typeof useTranslations>

export type ManagerLanguageRecord = {
  _id: string
  code: string
  name: string
  default?: boolean
  parent?: { _id?: string } | null
}

export const columns = ({
  setEdit,
  setDeleteLanguage,
  handleSetDefault,
  languages,
  hasPermissions,
  hasAnyPermission,
  t,
}: {
  setEdit: (language: ManagerLanguageRecord) => void
  setDeleteLanguage: (language: ManagerLanguageRecord | null) => void
  handleSetDefault: (languageCode: string) => void
  languages: ManagerLanguageRecord[]
  hasPermissions: (permissions: Permission[]) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  t: Translate
}): ColumnDef<ManagerLanguageRecord>[] => [
  {
    accessorKey: '_id',
    header: () => <span className="ml-2">{t('contentList.id')}</span>,
    cell: ({ row }) => <IDColumn _id={row.getValue('_id') as string} />,
  },
  {
    accessorKey: 'default',
    header: () => <span className="ml-2">{t('common.default')}</span>,
    cell: ({ row }) => (
      <BooleanIndicator value={Boolean(row.getValue('default'))} />
    ),
  },
  {
    accessorKey: 'code',
    header: () => <span className="ml-2">{t('common.code')}</span>,
    cell: ({ row }) => <span className="ml-2">{row.getValue('code')}</span>,
  },
  {
    accessorKey: 'name',
    header: () => <span className="ml-2">{t('fields.name')}</span>,
    cell: ({ row }) => <span className="ml-2">{row.getValue('name')}</span>,
  },
  {
    accessorKey: 'parent',
    header: () => <span className="ml-2">{t('common.parent')}</span>,
    cell: ({ row }) => (
      <span className="ml-2">
        {languages.find((lang) => lang._id === row.original.parent?._id)?.code ?? ''}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const language = row.original

      return (
        <DropdownMenu>
          {hasAnyPermission(['content.Language.updateAny', 'content.Language.deleteAny']) && (
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="m-auto flex h-8 w-8 items-center justify-center p-0!"
              >
                <span className="sr-only">{t('common.openMenu')}</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
          )}
          <DropdownMenuContent align="end">
            {hasPermissions(['content.Language.updateAny']) && (
              <DropdownMenuItem onClick={() => handleSetDefault(language.code)}>
                <Star />
                {t('settings.languages.setAsDefault')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {hasPermissions(['content.Language.deleteAny']) && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteLanguage(language)}
              >
                <Trash className="text-destructive" />
                {t('settings.languages.deleteNamed', {
                  name: language.name,
                  code: language.code,
                })}
              </DropdownMenuItem>
            )}
            {hasPermissions(['content.Language.updateAny']) && (
              <DropdownMenuItem onClick={() => setEdit(language)}>
                <Edit />
                {t('settings.languages.editNamed', {
                  name: language.name,
                  code: language.code,
                })}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
