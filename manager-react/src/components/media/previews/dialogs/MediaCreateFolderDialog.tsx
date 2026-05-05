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
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent aria-describedby='Create folder'>
        <DialogHeader>
          <DialogTitle>Create folder</DialogTitle>
        </DialogHeader>
        <DialogDescription>Enter a name for the new folder.</DialogDescription>
        <div className='py-2'>
          <Input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder='Folder name'
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
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
