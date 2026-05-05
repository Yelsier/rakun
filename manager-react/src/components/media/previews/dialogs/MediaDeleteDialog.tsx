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

type DeleteTarget = {
  contentType: 'Media' | 'MediaFolder'
  id: string
  name: string
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
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby='Delete media item'>
        <DialogHeader>
          <DialogTitle>
            Delete {target?.contentType === 'MediaFolder' ? 'folder' : 'file'}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to delete "{target?.name}"?
        </DialogDescription>
        <DialogFooter>
          <Button variant='ghost' onClick={onClose}>
            Cancel
          </Button>
          <Button variant='destructive' loading={isLoading} onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
