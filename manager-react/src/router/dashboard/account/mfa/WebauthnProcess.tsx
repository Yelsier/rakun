'use client'

import { webauthnRegisterVerifyInput, type WebauthnRegisterVerifyInput } from '@rakun-kit/core/contracts'
import { zodResolver } from '@hookform/resolvers/zod'
import { startRegistration } from '@simplewebauthn/browser'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { useManagerClient, useManagerMutation } from '@/client/react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useTranslations } from '@/i18n'
import { RecoveryCodes } from './RecoveryCodes'

export const WebauthnProcess = ({
  closeDialog,
  onCodesReady,
}: {
  closeDialog: () => void
  onCodesReady: () => void
}) => {
  const t = useTranslations()
  const client = useManagerClient()
  const [loading, setLoading] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const mutation = useManagerMutation('manager.auth.webauthn.register.verify')

  const form = useForm<Pick<WebauthnRegisterVerifyInput, 'deviceName'>>({
    resolver: zodResolver(webauthnRegisterVerifyInput.pick({ deviceName: true })),
    defaultValues: {
      deviceName: '',
    },
  })

  const onSubmit = async (
    data: Pick<WebauthnRegisterVerifyInput, 'deviceName'>,
  ) => {
    try {
      setLoading(true)
      const registerOptions = await client.request(
        'manager.auth.webauthn.register.options',
        {
          deviceName: data.deviceName,
        },
      )

      const attestation = await startRegistration({
        optionsJSON: registerOptions.options,
      })

      mutation.mutate(
        {
          deviceName: data.deviceName,
          token: registerOptions.token,
          response: attestation,
        },
        {
          onSuccess: (result) => {
            if (result.ok) {
              toast.success(
                t('account.mfa.deviceRegistered'),
              )
              if (result.recoveryCodes.length > 0) {
                setRecoveryCodes(result.recoveryCodes)
                onCodesReady()
              } else {
                closeDialog()
              }
            } else {
              toast.error(t('account.mfa.registerDeviceFailed'))
              form.reset()
            }
          },
          onError: () => {
            toast.error(t('account.mfa.registerDeviceFailed'))
            form.reset()
          },
          onSettled: () => {
            setLoading(false)
          },
        },
      )
    } catch {
      setLoading(false)
      toast.error(t('account.mfa.registerDeviceFailed'))
      form.reset()
    }
  }

  if (recoveryCodes) {
    return <RecoveryCodes codes={recoveryCodes} onDone={closeDialog} />
  }

  return (
    <form
      className='flex flex-col gap-4'
      onSubmit={form.handleSubmit((values) => void onSubmit(values))}
    >
      <Controller
        name='deviceName'
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor='deviceName'>{t('account.mfa.deviceName')}</FieldLabel>
            <Input
              {...field}
              id='deviceName'
              aria-invalid={fieldState.invalid}
              placeholder={t('account.mfa.deviceNamePlaceholder')}
            />
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />
      <Button loading={loading} type='submit'>
        {t('account.mfa.registerDevice')}
      </Button>
    </form>
  )
}
