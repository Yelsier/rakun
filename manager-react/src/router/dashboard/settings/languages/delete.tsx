'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { ManagerLanguageRecord } from './columns'

import { useLanguage } from '@/state/language'
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
  const [open, setOpen] = useState(false)
  const deleteMutation = useManagerMutation('manager.delete')
  const { refetch: refetchLanguages } = useLanguage()

  useEffect(() => {
    setOpen(Boolean(language))
  }, [language])

  useEffect(() => {
    if (!open) {
      setDeleteLanguage(null)
    }
  }, [open, setDeleteLanguage])

  const handleDelete = async () => {
    if (!language) return

    try {
      await deleteMutation.mutateAsync({
        contentType: 'Language',
        id: language._id,
      })
      refetch()
      refetchLanguages()
      setOpen(false)
      setDeleteLanguage(null)
      toast.success(t('settings.languages.deleted'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.languages.deleteError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby='Delete a language'>
        <DialogHeader>
          <DialogTitle>{t('settings.languages.deleteTitle')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {t('settings.languages.deleteConfirm')}
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant='ghost'>
            {t('common.cancel')}
          </Button>
          <Button
            loading={deleteMutation.isPending}
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
