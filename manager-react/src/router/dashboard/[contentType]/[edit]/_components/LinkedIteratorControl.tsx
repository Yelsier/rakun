'use client'

import { Link2, Unlink } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { useEditPageContext } from '../_context/EditPageContext'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ConfirmationAction = 'initialize' | 'relink'

export const LinkedIteratorControl = () => {
  const { contentTypeId, contentTypeName, documentActions, linkedIterator } =
    useEditPageContext()
  const { state, mode } = linkedIterator
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction | null>(
    null,
  )

  const handleConfirm = () => {
    const action = confirmationAction
    setConfirmationAction(null)

    if (action === 'initialize') {
      void documentActions.handleInitializeLinkedIterator()
    } else if (action === 'relink') {
      linkedIterator.adoptShared()
    }
  }

  const withConfirmationDialog = (content: ReactNode) => (
    <>
      {content}
      <Dialog
        open={confirmationAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmationAction(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmationAction === 'initialize'
                ? 'Use this as the shared structure?'
                : 'Use the shared structure?'}
            </DialogTitle>
            <DialogDescription>
              {confirmationAction === 'initialize'
                ? 'This iterator will become the structure for every linked entry. Local entries will not be changed.'
                : "This entry's local iterator will be discarded when you save. The shared structure itself will not be changed."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              loading={
                confirmationAction === 'initialize' &&
                (documentActions.pending.create || documentActions.pending.update)
              }
              onClick={handleConfirm}
            >
              <Link2 />
              Use shared structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  if (!linkedIterator.enabled || !state) return null

  if (!state.configured && mode === 'unlinked') {
    return withConfirmationDialog(
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <div className="space-y-1">
          <Badge variant="secondary">
            <Unlink />
            Local structure
          </Badge>
          <p className="text-sm text-muted-foreground">
            Changes only affect this entry. The shared structure has not been configured yet.
          </p>
        </div>
      </div>,
    )
  }

  if (!state.configured) {
    return withConfirmationDialog(
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Shared structure not configured</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose this iterator as the initial structure for every linked entry.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {contentTypeId ? (
            <Button variant="outline" onClick={() => linkedIterator.setMode('unlinked')}>
              <Unlink />
              Keep this entry local
            </Button>
          ) : null}
          {state.canUpdateShared ? (
            <Button
              variant="outline"
              loading={documentActions.pending.create || documentActions.pending.update}
              onClick={() => setConfirmationAction('initialize')}
            >
              <Link2 />
              Use this structure
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {contentTypeId
                ? 'The update-any permission is required to initialize it.'
                : 'Saving initializes it automatically only when this is the first entry.'}
            </p>
          )}
        </div>
      </div>,
    )
  }

  if (mode === 'unlinked') {
    return withConfirmationDialog(
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <div className="space-y-1">
          <Badge variant="secondary">
            <Unlink />
            Local structure
          </Badge>
          <p className="text-sm text-muted-foreground">
            Changes only affect this entry.
          </p>
        </div>
        <Button variant="outline" onClick={() => setConfirmationAction('relink')}>
          <Link2 />
          Use shared structure
        </Button>
      </div>,
    )
  }

  return withConfirmationDialog(
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <div className="space-y-1">
        <Badge>
          <Link2 />
          Shared structure
        </Badge>
        <p className="text-sm text-muted-foreground">
          {state.canUpdateShared
            ? `Iterator changes apply to every linked ${contentTypeName}.`
            : 'This shared iterator is read-only with your current permissions.'}
        </p>
      </div>
      {contentTypeId ? (
        <Button variant="outline" onClick={() => linkedIterator.setMode('unlinked')}>
          <Unlink />
          Unlink this entry
        </Button>
      ) : null}
    </div>,
  )
}
