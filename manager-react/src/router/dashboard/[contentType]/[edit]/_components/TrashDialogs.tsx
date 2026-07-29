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
import { useTranslations } from '@/i18n'

export const TrashDialogs = () => {
  const t = useTranslations()
  const {
    documentActions,
    hasLocaleVariants,
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
            <DialogTitle>{t('contentEdit.moveItemToTrash')}</DialogTitle>
            <DialogDescription>
              {hasLocaleVariants
                ? t('contentEdit.moveToTrashGroupDescription')
                : t('contentEdit.moveToTrashDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveToTrashOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              loading={documentActions.pending.trash}
              onClick={() => void documentActions.handleMoveToTrash()}
            >
              {t('contentList.moveToTrash')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={permanentDeleteOpen} onOpenChange={setPermanentDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('contentEdit.deleteItemPermanently')}</DialogTitle>
            <DialogDescription>
              {t('contentEdit.deletePermanentlyDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermanentDeleteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              loading={documentActions.pending.delete}
              onClick={() => void documentActions.handlePermanentDelete()}
            >
              {t('contentList.deletePermanently')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
