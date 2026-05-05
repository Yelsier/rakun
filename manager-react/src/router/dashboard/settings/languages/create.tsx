'use client'

import { useState } from 'react'

import { EditLanguageForm } from './editForm'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export const CreateLanguage = ({ refetch }: { refetch: () => void }) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Language</Button>
      </DialogTrigger>
      <DialogContent aria-describedby='Create a new language'>
        <DialogHeader>
          <DialogTitle>Create language</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Create a new language by filling out the form.
        </DialogDescription>
        <EditLanguageForm refetch={refetch} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  )
}

