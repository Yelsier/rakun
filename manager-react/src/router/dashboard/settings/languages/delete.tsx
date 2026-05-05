'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { ManagerLanguageRecord } from './columns'

import { useLanguage } from '@/state/language'
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

export const DeleteLanguage = ({
  refetch,
  language,
  setDeleteLanguage,
}: {
  refetch: () => void
  language: ManagerLanguageRecord | null
  setDeleteLanguage: (language: null) => void
}) => {
  const [open, setOpen] = useState(false)
  const deleteMutation = useManagerMutation('manager.delete')
  const { refetch: refetchLanguages } = useLanguage()

  useEffect(() => {
    setOpen(Boolean(language))
  }, [language])

  useEffect(() => {
    if (!open) {
      setDeleteLanguage(null)
    }
  }, [open, setDeleteLanguage])

  const handleDelete = async () => {
    if (!language) return

    try {
      await deleteMutation.mutateAsync({
        contentType: 'Language',
        id: language._id,
      })
      refetch()
      refetchLanguages()
      setOpen(false)
      setDeleteLanguage(null)
      toast.success('Language deleted successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting language')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby='Delete a language'>
        <DialogHeader>
          <DialogTitle>Delete language</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to delete this language?
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant='ghost'>
            Cancel
          </Button>
          <Button
            loading={deleteMutation.isPending}
            onClick={handleDelete}
            variant='destructive'
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

