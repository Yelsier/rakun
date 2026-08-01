import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { useManagerMutation } from '@/client/react'
import { confirm } from '@/components/confirm'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useTranslations } from '@/i18n'

const DeleteCT: React.FC<{
  refetch: () => void
  ct: string
  item: { _id: string } | null
  setDeleteItem: (item: null) => void
  mode: 'trash' | 'delete'
}> = ({ refetch, setDeleteItem, ct, item, mode }) => {
  const t = useTranslations()
  const mutation = useManagerMutation(
    mode === 'trash' ? 'manager.trash' : 'manager.delete',
  )
  const askedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (!item) {
      askedForRef.current = null
      return
    }

    const askKey = `${mode}:${item._id}`
    if (askedForRef.current === askKey) return
    askedForRef.current = askKey

    const target = item

    void (async () => {
      await confirm({
        title:
          mode === 'trash'
            ? t('contentEdit.moveItemToTrash')
            : t('contentEdit.deleteItemPermanently'),
        description:
          mode === 'trash'
            ? t('contentEdit.trashConfirmDescription')
            : t('contentEdit.deleteConfirmDescription'),
        confirmLabel:
          mode === 'trash'
            ? t('contentList.moveToTrash')
            : t('contentList.deletePermanently'),
        variant: 'destructive',
        onConfirm: async () => {
          try {
            await mutation.mutateAsync({
              contentType: ct,
              id: target._id,
            })
            refetch()
          } catch (error) {
            toast.error(
              getActionErrorMessage(error, t('contentEdit.couldNotDeleteItem')),
            )
            throw error
          }
        },
      })
      setDeleteItem(null)
    })()
  }, [ct, item, mode, mutation, refetch, setDeleteItem, t])

  return null
}

export default DeleteCT
