'use client'

import { Button } from '../../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select'
import { useTranslations } from '@/i18n'

type MoveTarget = {
  id?: string
  ids?: string[]
  name: string
  currentFolderId?: string
}

type FolderOption = {
  _id: string | null
  name: string
  path: string
}

type MediaMoveDialogProps = {
  target: MoveTarget | null
  folders: FolderOption[]
  value: string
  isLoading: boolean
  onValueChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

export default function MediaMoveDialog({
  target,
  folders,
  value,
  isLoading,
  onValueChange,
  onClose,
  onConfirm,
}: MediaMoveDialogProps) {
  const t = useTranslations()
  const bulkCount = target?.ids?.length ?? 0
  const isBulk = bulkCount > 0

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby='Move media item'>
        <DialogHeader>
          <DialogTitle>
            {bulkCount > 1 ? t('media.moveFilesTitle') : t('media.moveFileTitle')}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {isBulk
            ? t('media.moveBulkDescription', { count: bulkCount })
            : t('media.moveSingleDescription', { name: target?.name ?? '' })}
        </DialogDescription>
        <div className='py-2'>
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder={t('media.selectFolder')} />
            </SelectTrigger>
            <SelectContent>
              {folders.map((folder) => (
                <SelectItem
                  key={folder._id ?? 'root'}
                  value={folder._id ?? '__root__'}
                >
                  {folder.path}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant='ghost' onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            loading={isLoading}
            disabled={
              !value ||
              !target ||
              value === (target.currentFolderId ?? '__root__') ||
              folders.length === 0
            }
            onClick={onConfirm}
          >
            {t('common.move')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
