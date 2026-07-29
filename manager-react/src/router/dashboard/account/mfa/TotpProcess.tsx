'use client'

import { confirmTotpInput, type ConfirmTotpInput } from '@rakun-kit/core/contracts'
import { zodResolver } from '@hookform/resolvers/zod'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import { LoadingSpinner } from '@/components/loading-spinner'
import { Button } from '@/components/ui/button'
import { DialogDescription } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { useTranslations } from '@/i18n'

export const TotpProcess = ({ closeDialog }: { closeDialog: () => void }) => {
  const t = useTranslations()
  const enrollQuery = useManagerQuery({
    name: 'manager.auth.totp.enroll',
    input: undefined,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })
  const mutation = useManagerMutation('manager.auth.totp.confirm')

  const form = useForm<ConfirmTotpInput>({
    resolver: zodResolver(confirmTotpInput),
    defaultValues: {
      code: '',
    },
  })

  const handleSubmit = (data: ConfirmTotpInput) => {
    mutation.mutate(data, {
      onSuccess: (result) => {
        if (result.ok) {
          toast.success(t('account.mfa.totpSetupComplete'))
          closeDialog()
        } else {
          toast.error(t('account.mfa.verifyCodeFailed'))
          form.reset()
        }
      },
      onError: (error) => {
        toast.error(t('account.mfa.verifyCodeFailed'))
        form.reset()
        console.log(error)
      },
    })
  }

  return (
    <form
      className='flex flex-col items-center gap-4'
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      <DialogDescription>
        {t('account.mfa.scanBefore')}{' '}
        <a href={enrollQuery.data?.otpauthURL} className='font-bold underline'>
          {t('account.mfa.clickLink')}
        </a>{' '}
        {t('account.mfa.scanAfter')}
      </DialogDescription>
      {enrollQuery.data?.qrDataURL ? (
        <img src={enrollQuery.data.qrDataURL} alt='QR Code' />
      ) : (
        <div className='flex justify-center'>
          <LoadingSpinner />
        </div>
      )}
      <Controller
        name='code'
        control={form.control}
        render={({ field, fieldState }) => (
          <Field
            className='flex flex-col items-center gap-4'
            data-invalid={fieldState.invalid}
          >
            <FieldLabel htmlFor='code'>{t('account.mfa.verificationCode')}</FieldLabel>
            <InputOTP
              maxLength={6}
              id='code'
              required
              pattern={REGEXP_ONLY_DIGITS}
              containerClassName='justify-center'
              {...field}
            >
              <InputOTPGroup className='*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl'>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator className='mx-2' />
              <InputOTPGroup className='*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl'>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <Button loading={mutation.isPending} type='submit'>
              {t('common.verify')}
            </Button>
          </Field>
        )}
      />
    </form>
  )
}
