'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { TotpProcess } from './TotpProcess'
import { WebauthnProcess } from './WebauthnProcess'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from '@/i18n'
import { useSession } from '@/state/session'

export const MfaEnroller = ({ children }: { children: ReactNode }) => {
  const t = useTranslations()
  const { user } = useSession()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user.twoFactorEnabled) {
      toast.warning(
        t('account.mfa.setupWarning'),
        {
          action: {
            label: t('account.mfa.setupAction'),
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
  }, [t, user.twoFactorEnabled])

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
            <DialogTitle>{t('account.mfa.twoFactor')}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue='totp' className='gap-4'>
            <TabsList>
              <TabsTrigger value='totp'>{t('account.mfa.totp')}</TabsTrigger>
              <TabsTrigger value='webauthn'>{t('account.mfa.webauthn')}</TabsTrigger>
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
