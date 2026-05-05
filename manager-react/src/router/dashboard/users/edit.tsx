'use client'

import { useEffect, useState } from 'react'

import type { ManagerUserRecord } from './columns'
import { EditUserForm } from './editForm'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function EditUser({
  refetch,
  defaultValues,
  setEdit,
}: {
  refetch: () => void
  defaultValues: ManagerUserRecord | null
  setEdit: (user: null) => void
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(Boolean(defaultValues))
  }, [defaultValues])

  const handleClose = () => {
    setOpen(false)
    setEdit(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent aria-describedby='Edit user'>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
        </DialogHeader>
        <DialogDescription>Edit the user by filling out the form.</DialogDescription>
        <EditUserForm
          setOpen={setOpen}
          defaultValues={defaultValues || undefined}
          refetch={() => {
            refetch()
            setEdit(null)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
