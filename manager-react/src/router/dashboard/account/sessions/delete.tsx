'use client'

import type { AccountInfoOutput } from '@rakun-kit/core/contracts'
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'

import { useManagerMutation } from '@/client/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const [open, setOpen] = useState(false)
  const mutation = useManagerMutation('manager.auth.deleteSession')

  useEffect(() => {
    setOpen(Boolean(session))
  }, [session])

  useEffect(() => {
    if (!open) {
      setDeleteSession(null)
    }
  }, [open, setDeleteSession])

  const handleDelete = () => {
    if (!session) return

    mutation.mutate(
      {
        token: session,
      },
      {
        onSuccess: () => {
          setSessions((sessions: AccountInfoOutput['sessions']) =>
            sessions.filter(
              (item: AccountInfoOutput['sessions'][number]) =>
                item.token !== session,
            ),
          )
          setOpen(false)
          setDeleteSession(null)
          toast.success(t('account.sessions.deleted'))
        },
        onError: (error) => {
          toast.error(t('account.sessions.deleteError', { reason: error.message }))
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby='Delete session'>
        <DialogHeader>
          <DialogTitle>{t('account.sessions.delete')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {t('account.sessions.deleteConfirm')}
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant='ghost'>
            {t('common.cancel')}
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={handleDelete}
            variant='destructive'
          >
            {t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
