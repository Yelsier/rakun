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
            Delete {isFolder ? 'folder' : 'file'}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {isFolder
            ? `This will delete "${target?.name}" and everything inside it.`
            : `Are you sure you want to delete "${target?.name}"?`}
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
              I understand this will permanently delete the folder
              {target?.path ? ` "${target.path}"` : ` "${target?.name}"`} and
              all of its files and subfolders.
            </span>
          </label>
        ) : null}
        <DialogFooter>
          <Button variant='ghost' onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant='destructive'
            disabled={isFolder && !isFolderDeleteConfirmed}
            loading={isLoading}
            onClick={onConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
