'use client'

import { useState } from 'react'

import { EditUserForm } from './editForm'

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

export default function CreateUser({ refetch }: { refetch: () => void }) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t('users.add')}</Button>
      </DialogTrigger>
      <DialogContent aria-describedby='Create a new user'>
        <DialogHeader>
          <DialogTitle>{t('users.createTitle')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {t('users.createDescription')}
        </DialogDescription>
        <EditUserForm refetch={refetch} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  )
}
