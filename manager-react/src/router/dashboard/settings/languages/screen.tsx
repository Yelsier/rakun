'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { columns, type ManagerLanguageRecord } from './columns'
import { CreateLanguage } from './create'
import { DeleteLanguage } from './delete'
import { EditLanguage } from './edit'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import Loading from '@/components/loading'
import { PaginationController } from '@/components/PaginationController'
import { DataTable } from '@/components/ui/data-table'
import { useTranslations } from '@/i18n'
import { useSession } from '@/state/session'

export const ManagerSettingsLanguagesScreen = () => {
  const t = useTranslations()
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [edit, setEdit] = useState<ManagerLanguageRecord | null>(null)
  const [deleteLanguage, setDeleteLanguage] =
    useState<ManagerLanguageRecord | null>(null)
  const listQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'Language',
      query: { options: { limit: itemsPerPage, page } },
    },
  })
  const setDefaultLanguage = useManagerMutation('manager.setDefaultLanguage')
  const { hasPermissions, hasAnyPermission } = useSession()

  if (!listQuery.data) {
    return <Loading />
  }

  const data = listQuery.data
  const languages = data.items as ManagerLanguageRecord[]

  const handleSetDefault = async (languageCode: string) => {
    try {
      await setDefaultLanguage.mutateAsync({ language: languageCode })
      toast.success(t('settings.languages.defaultUpdated'))
      await listQuery.refetch()
    } catch {
      toast.error(t('settings.languages.defaultUpdateError'))
    }
  }

  return (
    <div className='container mx-auto flex flex-col items-start gap-6 px-4 py-10'>
      {hasPermissions(['content.Language.updateAny']) ? (
        <div className='self-end'>
          <CreateLanguage refetch={() => void listQuery.refetch()} />
        </div>
      ) : null}
      <EditLanguage
        refetch={() => void listQuery.refetch()}
        setEdit={setEdit}
        defaultValues={edit}
      />
      <DeleteLanguage
        refetch={() => void listQuery.refetch()}
        setDeleteLanguage={setDeleteLanguage}
        language={deleteLanguage}
      />
      <DataTable
        columns={columns({
          languages,
          setEdit,
          handleSetDefault,
          setDeleteLanguage,
          hasPermissions,
          hasAnyPermission,
          t,
        })}
        data={languages}
      />
      <PaginationController
        page={page}
        setPage={setPage}
        totalItems={data.totalItems}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
      />
    </div>
  )
}
