'use client'

import { useState } from 'react'

import { EditUserForm } from './editForm'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function CreateUser({ refetch }: { refetch: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add User</Button>
      </DialogTrigger>
      <DialogContent aria-describedby='Create a new user'>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Create a new user by filling out the form.
        </DialogDescription>
        <EditUserForm refetch={refetch} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  )
}
