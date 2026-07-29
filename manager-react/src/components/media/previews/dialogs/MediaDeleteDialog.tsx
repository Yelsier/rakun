'use client'

import { useEffect, useState } from 'react'

import { Button } from '../../../ui/button'
import { Checkbox } from '../../../ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog'
import { useTranslations } from '@/i18n'

type DeleteTarget = {
  contentType: 'Media' | 'MediaFolder'
  id: string
  name: string
  path?: string
}

type MediaDeleteDialogProps = {
  target: DeleteTarget | null
  isLoading: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function MediaDeleteDialog({
  target,
  isLoading,
  onClose,
  onConfirm,
}: MediaDeleteDialogProps) {
  const t = useTranslations()
  const [isFolderDeleteConfirmed, setIsFolderDeleteConfirmed] = useState(false)
  const isFolder = target?.contentType === 'MediaFolder'

  useEffect(() => {
    setIsFolderDeleteConfirmed(false)
  }, [target?.id])

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby='Delete media item'>
        <DialogHeader>
          <DialogTitle>
            {isFolder ? t('media.deleteFolderTitle') : t('media.deleteFileTitle')}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {isFolder
            ? t('media.deleteFolderDescription', { name: target?.name ?? '' })
            : t('media.deleteFileDescription', { name: target?.name ?? '' })}
        </DialogDescription>
        {isFolder ? (
          <label className='flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm'>
            <Checkbox
              checked={isFolderDeleteConfirmed}
              onCheckedChange={(checked) =>
                setIsFolderDeleteConfirmed(checked === true)
              }
              className='mt-0.5'
            />
            <span className='leading-5'>
              {t('media.deleteFolderConfirm', {
                path: target?.path || target?.name || '',
              })}
            </span>
          </label>
        ) : null}
        <DialogFooter>
          <Button variant='ghost' onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant='destructive'
            disabled={isFolder && !isFolderDeleteConfirmed}
            loading={isLoading}
            onClick={onConfirm}
          >
            {t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
