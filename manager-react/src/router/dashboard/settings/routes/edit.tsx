'use client'

import { useEffect, useState } from 'react'

import { EditRouteForm } from './editForm'
import type { ManagerRouteRecord } from './columns'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslations } from '@/i18n'
import { useLanguage } from '@/state/language'

export const EditRoute = ({
  refetch,
  defaultValues,
  setEdit,
}: {
  refetch: () => void
  defaultValues: ManagerRouteRecord | null
  setEdit: (route: null) => void
}) => {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const { language, setLanguage, languageList } = useLanguage()

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
      <DialogContent aria-describedby='Edit route'>
        <DialogHeader>
          <DialogTitle>{t('settings.routes.editTitle')}</DialogTitle>
        </DialogHeader>
        <div className='flex justify-between gap-4'>
          <DialogDescription>
            {t('settings.routes.editDescription')}
          </DialogDescription>
          <Select
            value={language.code}
            onValueChange={(value) => {
              const nextLanguage = languageList.find((item) => item.code === value)
              if (nextLanguage) {
                setLanguage(nextLanguage)
              }
            }}
          >
            <SelectTrigger className='w-45'>
              <SelectValue placeholder={t('settings.routes.selectLanguage')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t('settings.languages')}</SelectLabel>
                {languageList.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <EditRouteForm
          defaultValues={defaultValues ?? undefined}
          setOpen={setOpen}
          refetch={() => {
            refetch()
            setEdit(null)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

