'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import type { ManagerRoleRecord } from './columns'

import { useManagerMutation } from '@/client/react'
import { confirm } from '@/components/confirm'
import { useTranslations } from '@/i18n'

export const DeleteRole = ({
  refetch,
  role,
  setDelete,
}: {
  refetch: () => void
  role: ManagerRoleRecord | null
  setDelete: (role: null) => void
}) => {
  const t = useTranslations()
  const mutation = useManagerMutation('manager.delete')
  const askedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (!role) {
      askedForRef.current = null
      return
    }

    if (askedForRef.current === role._id) return
    askedForRef.current = role._id

    const target = role

    void (async () => {
      await confirm({
        title: t('settings.roles.deleteTitle'),
        description: t('settings.roles.deleteConfirm'),
        confirmLabel: t('common.delete'),
        variant: 'destructive',
        onConfirm: async () => {
          try {
            await mutation.mutateAsync({
              contentType: 'ManagerRole',
              id: target._id,
            })
            refetch()
            toast.success(t('settings.roles.deleted'))
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : t('settings.roles.deleteError'),
            )
            throw error
          }
        },
      })
      setDelete(null)
    })()
  }, [mutation, refetch, role, setDelete, t])

  return null
}
