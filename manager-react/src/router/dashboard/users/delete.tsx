'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { ManagerUserRecord } from './columns'

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
  const [open, setOpen] = useState(false)
  const mutation = useManagerMutation('manager.delete')

  useEffect(() => {
    setOpen(Boolean(user))
  }, [user])

  useEffect(() => {
    if (!open) {
      setDeleteUser(null)
    }
  }, [open, setDeleteUser])

  const handleDelete = async () => {
    if (!user) return

    try {
      await mutation.mutateAsync({
        contentType: 'ManagerUser',
        id: user._id,
      })
      refetch()
      setOpen(false)
      setDeleteUser(null)
      toast.success(t('users.deleted'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('users.deleteError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby='Delete a user'>
        <DialogHeader>
          <DialogTitle>{t('users.deleteTitle')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {t('users.deleteConfirm')}
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant='ghost'>
            {t('common.cancel')}
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => void handleDelete()}
            variant='destructive'
          >
            {t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
