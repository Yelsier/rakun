'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import type { ManagerUserRecord } from './columns'

import { useManagerMutation } from '@/client/react'
import { confirm } from '@/components/confirm'
import { useTranslations } from '@/i18n'

export default function DeleteUser({
  refetch,
  user,
  setDeleteUser,
}: {
  refetch: () => void
  user: ManagerUserRecord | null
  setDeleteUser: (user: null) => void
}) {
  const t = useTranslations()
  const mutation = useManagerMutation('manager.delete')
  const askedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      askedForRef.current = null
      return
    }

    if (askedForRef.current === user._id) return
    askedForRef.current = user._id

    const target = user

    void (async () => {
      await confirm({
        title: t('users.deleteTitle'),
        description: t('users.deleteConfirm'),
        confirmLabel: t('common.delete'),
        variant: 'destructive',
        onConfirm: async () => {
          try {
            await mutation.mutateAsync({
              contentType: 'ManagerUser',
              id: target._id,
            })
            refetch()
            toast.success(t('users.deleted'))
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : t('users.deleteError'),
            )
            throw error
          }
        },
      })
      setDeleteUser(null)
    })()
  }, [mutation, refetch, setDeleteUser, t, user])

  return null
}
