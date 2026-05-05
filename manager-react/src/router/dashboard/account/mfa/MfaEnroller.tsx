'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { TotpProcess } from './TotpProcess'
import { WebauthnProcess } from './WebauthnProcess'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession } from '@/state/session'

export const MfaEnroller = ({ children }: { children: ReactNode }) => {
  const { user } = useSession()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user.twoFactorEnabled) {
      toast.warning(
        'You have not set up 2FA yet. Please set it up to secure your account.',
        {
          action: {
            label: 'Set up 2FA',
            onClick: () => {
              setOpen(true)
            },
          },
          id: 'mfa-enrollment',
          closeButton: true,
          duration: Infinity,
        },
      )
    }
  }, [user.twoFactorEnabled])

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className='w-92'
          onInteractOutside={(event) => {
            event.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue='totp' className='gap-4'>
            <TabsList>
              <TabsTrigger value='totp'>TOTP</TabsTrigger>
              <TabsTrigger value='webauthn'>WebAuthn</TabsTrigger>
            </TabsList>
            <TabsContent value='totp'>
              <TotpProcess closeDialog={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value='webauthn'>
              <WebauthnProcess closeDialog={() => setOpen(false)} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
