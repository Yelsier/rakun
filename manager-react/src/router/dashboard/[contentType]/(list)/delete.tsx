import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useManagerMutation } from '@/client/react'
import { Button } from '@/components/ui/button'
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
          toast.error(`Error: ${error.message}`)
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
            {mode === 'trash' ? 'Move item to trash' : 'Delete item permanently'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'trash'
              ? 'Are you sure you want to move this item to trash? It will be hidden from lists and public routes until restored.'
              : 'Are you sure you want to permanently delete this item? This cannot be undone.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant='outline'>
            Cancel
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={handleDelete}
            variant='destructive'
          >
            {mode === 'trash' ? 'Move to trash' : 'Delete permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteCT
