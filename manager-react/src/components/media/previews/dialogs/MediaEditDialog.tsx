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

type EditTarget = {
  contentType: 'Media' | 'MediaFolder'
  id: string
  name: string
}

type MediaEditDialogProps = {
  target: EditTarget | null
  value: string
  isLoading: boolean
  onValueChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

export default function MediaEditDialog({
  target,
  value,
  isLoading,
  onValueChange,
  onClose,
  onConfirm,
}: MediaEditDialogProps) {
  const t = useTranslations()

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby='Edit media item'>
        <DialogHeader>
          <DialogTitle>
            {target?.contentType === 'MediaFolder'
              ? t('media.editFolderTitle')
              : t('media.editFileTitle')}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>{t('media.editDescription')}</DialogDescription>
        <div className='py-2'>
          <Input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={t('fields.name')}
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
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
