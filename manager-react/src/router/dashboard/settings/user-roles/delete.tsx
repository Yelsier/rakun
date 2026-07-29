'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { ManagerRoleRecord } from './columns'

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
  const [open, setOpen] = useState(false)
  const mutation = useManagerMutation('manager.delete')

  useEffect(() => {
    setOpen(Boolean(role))
  }, [role])

  useEffect(() => {
    if (!open) {
      setDelete(null)
    }
  }, [open, setDelete])

  const handleDelete = async () => {
    if (!role) return

    try {
      await mutation.mutateAsync({
        contentType: 'ManagerRole',
        id: role._id,
      })
      refetch()
      setOpen(false)
      setDelete(null)
      toast.success(t('settings.roles.deleted'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.roles.deleteError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby='Delete a role'>
        <DialogHeader>
          <DialogTitle>{t('settings.roles.deleteTitle')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {t('settings.roles.deleteConfirm')}
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

