'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import type { ManagerLanguageRecord } from './columns'

import { useLanguage } from '@/state/language'
import { useManagerMutation } from '@/client/react'
import { confirm } from '@/components/confirm'
import { useTranslations } from '@/i18n'

export const DeleteLanguage = ({
  refetch,
  language,
  setDeleteLanguage,
}: {
  refetch: () => void
  language: ManagerLanguageRecord | null
  setDeleteLanguage: (language: null) => void
}) => {
  const t = useTranslations()
  const deleteMutation = useManagerMutation('manager.delete')
  const { refetch: refetchLanguages } = useLanguage()
  const askedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (!language) {
      askedForRef.current = null
      return
    }

    if (askedForRef.current === language._id) return
    askedForRef.current = language._id

    const target = language

    void (async () => {
      await confirm({
        title: t('settings.languages.deleteTitle'),
        description: t('settings.languages.deleteConfirm'),
        confirmLabel: t('common.delete'),
        variant: 'destructive',
        onConfirm: async () => {
          try {
            await deleteMutation.mutateAsync({
              contentType: 'Language',
              id: target._id,
            })
            refetch()
            refetchLanguages()
            toast.success(t('settings.languages.deleted'))
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : t('settings.languages.deleteError'),
            )
            throw error
          }
        },
      })
      setDeleteLanguage(null)
    })()
  }, [deleteMutation, language, refetch, refetchLanguages, setDeleteLanguage, t])

  return null
}
