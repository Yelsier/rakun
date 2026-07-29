'use client'

import { useState } from 'react'

import { EditLanguageForm } from './editForm'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useTranslations } from '@/i18n'

export const CreateLanguage = ({ refetch }: { refetch: () => void }) => {
  const t = useTranslations()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t('settings.languages.add')}</Button>
      </DialogTrigger>
      <DialogContent aria-describedby='Create a new language'>
        <DialogHeader>
          <DialogTitle>{t('settings.languages.createTitle')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {t('settings.languages.createDescription')}
        </DialogDescription>
        <EditLanguageForm refetch={refetch} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  )
}
