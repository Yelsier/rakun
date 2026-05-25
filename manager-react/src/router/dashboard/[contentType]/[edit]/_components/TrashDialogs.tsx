'use client'

import { useEditPageContext } from '../_context/EditPageContext'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export const TrashDialogs = () => {
  const {
    documentActions,
    moveToTrashOpen,
    permanentDeleteOpen,
    setMoveToTrashOpen,
    setPermanentDeleteOpen,
  } = useEditPageContext()

  return (
    <>
      <Dialog open={moveToTrashOpen} onOpenChange={setMoveToTrashOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move item to trash</DialogTitle>
            <DialogDescription>
              This item will be hidden from lists and public routes. You can restore it from the
              trash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setMoveToTrashOpen(false)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              loading={documentActions.pending.trash}
              onClick={() => void documentActions.handleMoveToTrash()}
            >
              Move to trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={permanentDeleteOpen} onOpenChange={setPermanentDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item permanently</DialogTitle>
            <DialogDescription>
              This item will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setPermanentDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              loading={documentActions.pending.delete}
              onClick={() => void documentActions.handlePermanentDelete()}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
