'use client'

import type { AccountInfoOutput } from '@rakun-kit/core/contracts'
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
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

export default function DeleteSession({
  setSessions,
  session,
  setDeleteSession,
}: {
  setSessions: Dispatch<SetStateAction<AccountInfoOutput['sessions']>>
  session: string | null
  setDeleteSession: (session: null) => void
}) {
  const [open, setOpen] = useState(false)
  const mutation = useManagerMutation('manager.auth.deleteSession')

  useEffect(() => {
    setOpen(Boolean(session))
  }, [session])

  useEffect(() => {
    if (!open) {
      setDeleteSession(null)
    }
  }, [open, setDeleteSession])

  const handleDelete = () => {
    if (!session) return

    mutation.mutate(
      {
        token: session,
      },
      {
        onSuccess: () => {
          setSessions((sessions: AccountInfoOutput['sessions']) =>
            sessions.filter(
              (item: AccountInfoOutput['sessions'][number]) =>
                item.token !== session,
            ),
          )
          setOpen(false)
          setDeleteSession(null)
          toast.success('Session deleted successfully!')
        },
        onError: (error) => {
          toast.error(`Error: ${error.message}`)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby='Delete session'>
        <DialogHeader>
          <DialogTitle>Delete session</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to delete this session?
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
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
