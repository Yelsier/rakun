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
      <DialogContent aria-describedby='Create a new language'>
        <DialogHeader>
          <DialogTitle>
            {mode === 'trash' ? 'Move item to trash' : 'Delete item permanently'}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {mode === 'trash'
            ? 'This item will be hidden from lists and public routes. You can restore it from the trash.'
            : 'This item will be permanently deleted. This cannot be undone.'}
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant='ghost'>
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
