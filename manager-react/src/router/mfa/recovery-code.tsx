'use client'

import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { useManagerMutation } from '@/client/react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useTranslations } from '@/i18n'

type RecoveryCodeFormInput = {
  code: string
}

export default function RecoveryCodeForm({
  challenge,
  onSuccess,
  onExpired,
}: {
  challenge: string
  onSuccess: () => void | Promise<void>
  onExpired: () => void
}) {
  const t = useTranslations()
  const mutation = useManagerMutation('manager.auth.mfa.verifyRecoveryCode')
  const form = useForm<RecoveryCodeFormInput>({
    defaultValues: { code: '' },
  })

  return (
    <Card className='mx-auto w-92'>
      <CardHeader>
        <CardTitle>{t('mfa.recoveryCodeTitle')}</CardTitle>
        <CardDescription>{t('mfa.recoveryCodeDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className='space-y-4'
          onSubmit={form.handleSubmit((values) => {
            mutation.mutate(
              { challenge, code: values.code.trim() },
              {
                onSuccess: async (result) => {
                  if ('token' in result) {
                    await onSuccess()
                    return
                  }
                  form.setError('code', {
                    message: t('mfa.invalidRecoveryCode'),
                  })
                },
                onError: (error) => {
                  const expired =
                    typeof error === 'object' &&
                    error !== null &&
                    'key' in error &&
                    (error.key === 'NOT_FOUND' || error.key === 'CONFLICT')
                  if (expired) {
                    onExpired()
                    return
                  }
                  toast.error(t('mfa.recoveryCodeError'))
                },
              },
            )
          })}
        >
          <Field>
            <FieldLabel htmlFor='recovery-code'>
              {t('mfa.recoveryCodeLabel')}
            </FieldLabel>
            <Input
              {...form.register('code', { required: true })}
              autoComplete='one-time-code'
              id='recovery-code'
              spellCheck={false}
            />
            <FieldError errors={[form.formState.errors.code]} />
          </Field>
          <Button className='w-full' loading={mutation.isPending} type='submit'>
            {t('common.verify')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
