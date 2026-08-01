'use client'

import type { AccountInfoOutput } from '@rakun-kit/core/contracts'
import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'

import { useManagerMutation } from '@/client/react'
import { confirm } from '@/components/confirm'
import { useTranslations } from '@/i18n'

export default function DeleteSession({
  setSessions,
  session,
  setDeleteSession,
}: {
  setSessions: Dispatch<SetStateAction<AccountInfoOutput['sessions']>>
  session: string | null
  setDeleteSession: (session: null) => void
}) {
  const t = useTranslations()
  const mutation = useManagerMutation('manager.auth.deleteSession')
  const askedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (!session) {
      askedForRef.current = null
      return
    }

    if (askedForRef.current === session) return
    askedForRef.current = session

    const token = session

    void (async () => {
      await confirm({
        title: t('account.sessions.delete'),
        description: t('account.sessions.deleteConfirm'),
        confirmLabel: t('common.delete'),
        variant: 'destructive',
        onConfirm: async () => {
          try {
            await mutation.mutateAsync({ token })
            setSessions((sessions) =>
              sessions.filter((item) => item.token !== token),
            )
            toast.success(t('account.sessions.deleted'))
          } catch (error) {
            toast.error(
              t('account.sessions.deleteError', {
                reason: error instanceof Error ? error.message : String(error),
              }),
            )
            throw error
          }
        },
      })
      setDeleteSession(null)
    })()
  }, [mutation, session, setDeleteSession, setSessions, t])

  return null
}
