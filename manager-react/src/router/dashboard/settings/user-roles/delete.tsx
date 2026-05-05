'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { ManagerRoleRecord } from './columns'

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

export const DeleteRole = ({
  refetch,
  role,
  setDelete,
}: {
  refetch: () => void
  role: ManagerRoleRecord | null
  setDelete: (role: null) => void
}) => {
  const [open, setOpen] = useState(false)
  const mutation = useManagerMutation('manager.delete')

  useEffect(() => {
    setOpen(Boolean(role))
  }, [role])

  useEffect(() => {
    if (!open) {
      setDelete(null)
    }
  }, [open, setDelete])

  const handleDelete = async () => {
    if (!role) return

    try {
      await mutation.mutateAsync({
        contentType: 'ManagerRole',
        id: role._id,
      })
      refetch()
      setOpen(false)
      setDelete(null)
      toast.success('Role deleted successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting role')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby='Delete a role'>
        <DialogHeader>
          <DialogTitle>Delete role</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to delete this role?
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

