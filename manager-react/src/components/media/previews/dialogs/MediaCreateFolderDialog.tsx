'use client'

import { Input } from '../../../ui/input'
import { Button } from '../../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog'
import { useTranslations } from '@/i18n'

type MediaCreateFolderDialogProps = {
  open: boolean
  value: string
  isLoading: boolean
  onValueChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

export default function MediaCreateFolderDialog({
  open,
  value,
  isLoading,
  onValueChange,
  onClose,
  onConfirm,
}: MediaCreateFolderDialogProps) {
  const t = useTranslations()

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent aria-describedby='Create folder'>
        <DialogHeader>
          <DialogTitle>{t('media.createFolder')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>{t('media.createFolderDescription')}</DialogDescription>
        <div className='py-2'>
          <Input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={t('media.folderNamePlaceholder')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onConfirm()
            }}
          />
        </div>
        <DialogFooter>
          <Button variant='ghost' onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button loading={isLoading} onClick={onConfirm}>
            {t('contentList.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
