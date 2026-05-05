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
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby='Edit media item'>
        <DialogHeader>
          <DialogTitle>
            Edit {target?.contentType === 'MediaFolder' ? 'folder' : 'file'}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>Update the name.</DialogDescription>
        <div className='py-2'>
          <Input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder='Name'
            onKeyDown={(event) => {
              if (event.key === 'Enter') onConfirm()
            }}
          />
        </div>
        <DialogFooter>
          <Button variant='ghost' onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isLoading} onClick={onConfirm}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
