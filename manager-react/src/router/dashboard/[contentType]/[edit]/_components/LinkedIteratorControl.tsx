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
import { useTranslations } from '@/i18n'

type ConfirmationAction = 'initialize' | 'relink'

export const LinkedIteratorControl = () => {
  const t = useTranslations()
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
                ? t('contentEdit.useThisAsSharedTitle')
                : t('contentEdit.useSharedTitle')}
            </DialogTitle>
            <DialogDescription>
              {confirmationAction === 'initialize'
                ? t('contentEdit.useThisAsSharedDescription')
                : t('contentEdit.useSharedDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              loading={
                confirmationAction === 'initialize' &&
                (documentActions.pending.create || documentActions.pending.update)
              }
              onClick={handleConfirm}
            >
              <Link2 />
              {t('contentEdit.useSharedStructure')}
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
            {t('contentEdit.localStructure')}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {t('contentEdit.localStructureUnconfiguredDescription')}
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
            <Badge variant="outline">{t('contentEdit.sharedStructureNotConfigured')}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('contentEdit.chooseSharedStructureDescription')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {contentTypeId ? (
            <Button variant="outline" onClick={() => linkedIterator.setMode('unlinked')}>
              <Unlink />
              {t('contentEdit.keepThisEntryLocal')}
            </Button>
          ) : null}
          {state.canUpdateShared ? (
            <Button
              variant="outline"
              loading={documentActions.pending.create || documentActions.pending.update}
              onClick={() => setConfirmationAction('initialize')}
            >
              <Link2 />
              {t('contentEdit.useThisStructure')}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {contentTypeId
                ? t('contentEdit.updateAnyRequired')
                : t('contentEdit.firstEntryInitializes')}
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
            {t('contentEdit.localStructure')}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {t('contentEdit.localStructureDescription')}
          </p>
        </div>
        <Button variant="outline" onClick={() => setConfirmationAction('relink')}>
          <Link2 />
          {t('contentEdit.useSharedStructure')}
        </Button>
      </div>,
    )
  }

  return withConfirmationDialog(
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <div className="space-y-1">
        <Badge>
          <Link2 />
          {t('contentEdit.sharedStructure')}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {state.canUpdateShared
            ? t('contentEdit.iteratorChangesApply', { contentType: contentTypeName })
            : t('contentEdit.sharedIteratorReadOnly')}
        </p>
      </div>
      {contentTypeId ? (
        <Button variant="outline" onClick={() => linkedIterator.setMode('unlinked')}>
          <Unlink />
          {t('contentEdit.unlinkThisEntry')}
        </Button>
      ) : null}
    </div>,
  )
}
