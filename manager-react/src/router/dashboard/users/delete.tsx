'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { ManagerUserRecord } from './columns'

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

export default function DeleteUser({
  refetch,
  user,
  setDeleteUser,
}: {
  refetch: () => void
  user: ManagerUserRecord | null
  setDeleteUser: (user: null) => void
}) {
  const [open, setOpen] = useState(false)
  const mutation = useManagerMutation('manager.delete')

  useEffect(() => {
    setOpen(Boolean(user))
  }, [user])

  useEffect(() => {
    if (!open) {
      setDeleteUser(null)
    }
  }, [open, setDeleteUser])

  const handleDelete = async () => {
    if (!user) return

    try {
      await mutation.mutateAsync({
        contentType: 'ManagerUser',
        id: user._id,
      })
      refetch()
      setOpen(false)
      setDeleteUser(null)
      toast.success('User deleted successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting user')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby='Delete a user'>
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to delete this user?
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant='ghost'>
            Cancel
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => void handleDelete()}
            variant='destructive'
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
