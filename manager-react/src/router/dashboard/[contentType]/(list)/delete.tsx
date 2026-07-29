import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useManagerMutation } from '@/client/react'
import { Button } from '@/components/ui/button'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useTranslations } from '@/i18n'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const DeleteCT: React.FC<{
  refetch: () => void
  ct: string
  item: { _id: string } | null
  setDeleteItem: (item: null) => void
  mode: 'trash' | 'delete'
}> = ({ refetch, setDeleteItem, ct, item, mode }) => {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const mutation = useManagerMutation(
    mode === 'trash' ? 'manager.trash' : 'manager.delete',
  )

  useEffect(() => {
    if (item) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [item])

  const handleDelete = () => {
    if (!item) return

    mutation.mutate(
      {
        contentType: ct,
        id: item._id,
      },
      {
        onSuccess: () => {
          refetch()
          setOpen(false)
          setDeleteItem(null)
        },
        onError: (error) => {
          toast.error(
            getActionErrorMessage(error, t('contentEdit.couldNotDeleteItem')),
          )
        },
      },
    )
  }

  useEffect(() => {
    if (!open) {
      setDeleteItem(null)
    }
  }, [open, setDeleteItem])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'trash'
              ? t('contentEdit.moveItemToTrash')
              : t('contentEdit.deleteItemPermanently')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'trash'
              ? t('contentEdit.trashConfirmDescription')
              : t('contentEdit.deleteConfirmDescription')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant='outline'>
            {t('common.cancel')}
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={handleDelete}
            variant='destructive'
          >
            {mode === 'trash'
              ? t('contentList.moveToTrash')
              : t('contentList.deletePermanently')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteCT
