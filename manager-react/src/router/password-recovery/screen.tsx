'use client'

import {
  requestPasswordResetInput,
  resetPasswordInput,
  type RequestPasswordResetInput,
} from '@rakun-kit/core/contracts'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { useManagerMutation } from '@/client/react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useTranslations } from '@/i18n'
import { useManagerNavigation } from '@/state/navigation'
import { AuthLanguageSelector } from '@/components/auth-language-selector'

const useLoginHref = () => {
  const navigation = useManagerNavigation()
  return navigation.hrefPath?.('/login') ?? '/login'
}

const AuthRecoveryFrame = ({ children }: { children: ReactNode }) => (
  <div>
    <AuthLanguageSelector />
    {children}
  </div>
)

export function ManagerForgotPasswordScreen() {
  const t = useTranslations()
  const loginHref = useLoginHref()
  const [sent, setSent] = useState(false)
  const mutation = useManagerMutation('manager.auth.password.requestReset')
  const form = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetInput),
    defaultValues: { email: '' },
  })

  if (sent) {
    return (
      <AuthRecoveryFrame>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <CardTitle>{t('passwordRecovery.emailSentTitle')}</CardTitle>
            <CardDescription>
              {t('passwordRecovery.emailSentDescription')}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className='w-full' variant='outline'>
              <a href={loginHref}>{t('passwordRecovery.backToLogin')}</a>
            </Button>
          </CardFooter>
        </Card>
      </AuthRecoveryFrame>
    )
  }

  return (
    <AuthRecoveryFrame>
      <Card className='w-full max-w-sm'>
        <CardHeader>
          <CardTitle>{t('passwordRecovery.forgotTitle')}</CardTitle>
          <CardDescription>
            {t('passwordRecovery.forgotDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className='space-y-4'
            onSubmit={form.handleSubmit((values) => {
              mutation.mutate(
                { email: values.email.trim().toLowerCase() },
                {
                  onSuccess: () => setSent(true),
                  onError: () =>
                    form.setError('email', {
                      type: 'server',
                      message: t('passwordRecovery.requestError'),
                    }),
                },
              )
            })}
          >
            <Controller
              control={form.control}
              name='email'
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='recovery-email'>
                    {t('common.email')}
                  </FieldLabel>
                  <Input
                    {...field}
                    autoComplete='email'
                    id='recovery-email'
                    type='email'
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError
                    errors={
                      fieldState.error
                        ? [
                            {
                              ...fieldState.error,
                              message:
                                fieldState.error.type === 'server'
                                  ? t('passwordRecovery.requestError')
                                  : t('passwordRecovery.invalidEmail'),
                            },
                          ]
                        : []
                    }
                  />
                </Field>
              )}
            />
            <Button className='w-full' loading={mutation.isPending} type='submit'>
              {t('passwordRecovery.sendLink')}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <a className='w-full text-center text-sm underline' href={loginHref}>
            {t('passwordRecovery.backToLogin')}
          </a>
        </CardFooter>
      </Card>
    </AuthRecoveryFrame>
  )
}

const resetFormSchema = z
  .object({
    password: resetPasswordInput.shape.password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'PASSWORDS_DO_NOT_MATCH',
  })

type ResetFormInput = z.infer<typeof resetFormSchema>

export function ManagerResetPasswordScreen({ token }: { token?: string }) {
  const t = useTranslations()
  const loginHref = useLoginHref()
  const [complete, setComplete] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const mutation = useManagerMutation('manager.auth.password.reset')
  const form = useForm<ResetFormInput>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  if (!token || invalid) {
    return (
      <AuthRecoveryFrame>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <CardTitle>{t('passwordRecovery.invalidTitle')}</CardTitle>
            <CardDescription>
              {t('passwordRecovery.invalidDescription')}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className='w-full'>
              <a href={loginHref}>{t('passwordRecovery.backToLogin')}</a>
            </Button>
          </CardFooter>
        </Card>
      </AuthRecoveryFrame>
    )
  }

  if (complete) {
    return (
      <AuthRecoveryFrame>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <CardTitle>{t('passwordRecovery.completeTitle')}</CardTitle>
            <CardDescription>
              {t('passwordRecovery.completeDescription')}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className='w-full'>
              <a href={loginHref}>{t('login.submit')}</a>
            </Button>
          </CardFooter>
        </Card>
      </AuthRecoveryFrame>
    )
  }

  return (
    <AuthRecoveryFrame>
      <Card className='w-full max-w-sm'>
        <CardHeader>
          <CardTitle>{t('passwordRecovery.resetTitle')}</CardTitle>
          <CardDescription>
            {t('passwordRecovery.resetDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className='space-y-4'
            onSubmit={form.handleSubmit((values) => {
              mutation.mutate(
                { token, password: values.password },
                {
                  onSuccess: () => setComplete(true),
                  onError: () => setInvalid(true),
                },
              )
            })}
          >
            <Controller
              control={form.control}
              name='password'
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='new-password'>
                    {t('passwordRecovery.newPassword')}
                  </FieldLabel>
                  <Input
                    {...field}
                    autoComplete='new-password'
                    id='new-password'
                    type='password'
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError
                    errors={
                      fieldState.error
                        ? [
                            {
                              ...fieldState.error,
                              message: t('passwordRecovery.passwordRequirements'),
                            },
                          ]
                        : []
                    }
                  />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='confirmPassword'
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='confirm-password'>
                    {t('passwordRecovery.confirmPassword')}
                  </FieldLabel>
                  <Input
                    {...field}
                    autoComplete='new-password'
                    id='confirm-password'
                    type='password'
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError
                    errors={
                      fieldState.error
                        ? [
                            {
                              ...fieldState.error,
                              message: t('passwordRecovery.passwordsDoNotMatch'),
                            },
                          ]
                        : []
                    }
                  />
                </Field>
              )}
            />
            <Button className='w-full' loading={mutation.isPending} type='submit'>
              {t('passwordRecovery.resetAction')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthRecoveryFrame>
  )
}
