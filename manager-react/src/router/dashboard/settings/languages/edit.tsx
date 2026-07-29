'use client'

import { useEffect, useState } from 'react'

import { EditLanguageForm } from './editForm'
import type { ManagerLanguageRecord } from './columns'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslations } from '@/i18n'

export const EditLanguage = ({
  refetch,
  defaultValues,
  setEdit,
}: {
  refetch: () => void
  defaultValues: ManagerLanguageRecord | null
  setEdit: (language: null) => void
}) => {
  const t = useTranslations()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(Boolean(defaultValues))
  }, [defaultValues])

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEdit(null)
    }
    setOpen(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent aria-describedby='Edit language'>
        <DialogHeader>
          <DialogTitle>{t('settings.languages.editTitle')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {t('settings.languages.editDescription')}
        </DialogDescription>
        <EditLanguageForm
          defaultValues={defaultValues ?? undefined}
          refetch={() => {
            refetch()
            setEdit(null)
          }}
          setOpen={setOpen}
        />
      </DialogContent>
    </Dialog>
  )
}

