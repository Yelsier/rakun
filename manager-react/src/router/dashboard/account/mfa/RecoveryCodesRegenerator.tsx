'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { useManagerMutation } from '@/client/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useTranslations } from '@/i18n'
import { RecoveryCodes } from './RecoveryCodes'

export const RecoveryCodesRegenerator = () => {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [codes, setCodes] = useState<string[] | null>(null)
  const mutation = useManagerMutation(
    'manager.auth.mfa.regenerateRecoveryCodes',
  )
  const form = useForm<{ currentPassword: string }>({
    defaultValues: { currentPassword: '' },
  })

  const close = () => {
    setOpen(false)
    setCodes(null)
    form.reset()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} type='button' variant='outline'>
        {t('account.mfa.regenerateRecoveryCodes')}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value && codes) return
          value ? setOpen(true) : close()
        }}
      >
        <DialogContent
          showCloseButton={!codes}
          onEscapeKeyDown={(event) => {
            if (codes) event.preventDefault()
          }}
          onInteractOutside={(event) => {
            if (codes) event.preventDefault()
          }}
        >
          {codes ? (
            <RecoveryCodes codes={codes} onDone={close} />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {t('account.mfa.regenerateRecoveryCodes')}
                </DialogTitle>
                <DialogDescription>
                  {t('account.mfa.regenerateDescription')}
                </DialogDescription>
              </DialogHeader>
              <form
                className='space-y-4'
                onSubmit={form.handleSubmit((values) => {
                  mutation.mutate(values, {
                    onSuccess: (result) => setCodes(result.recoveryCodes),
                    onError: () => {
                      form.setError('currentPassword', {
                        message: t('account.mfa.currentPasswordInvalid'),
                      })
                      toast.error(t('account.mfa.regenerateFailed'))
                    },
                  })
                })}
              >
                <Field>
                  <FieldLabel htmlFor='recovery-current-password'>
                    {t('account.mfa.currentPassword')}
                  </FieldLabel>
                  <Input
                    {...form.register('currentPassword', { required: true })}
                    autoComplete='current-password'
                    id='recovery-current-password'
                    type='password'
                  />
                  <FieldError errors={[form.formState.errors.currentPassword]} />
                </Field>
                <Button className='w-full' loading={mutation.isPending} type='submit'>
                  {t('account.mfa.regenerateAction')}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
