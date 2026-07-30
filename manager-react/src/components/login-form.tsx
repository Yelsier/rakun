'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { instanceofAppErrorShape, loginInput, type LoginInput } from '@rakun-kit/core/client'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { cn } from '../lib/utils'
import { useManagerRuntimeAuth } from '@/app/runtime-auth'
import { useTranslations } from '@/i18n'
import { useManagerNavigation } from '@/state/navigation'
import { useManagerMutation } from '@/client/react'
import { Button } from './ui/button'
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from './ui/field'
import { Input } from './ui/input'
import { AuthLanguageSelector } from './auth-language-selector'
import { RakunLogoMark } from './rakun-logo'

export function LoginForm({
  className,
  passwordRecoveryEnabled = false,
  ...props
}: React.ComponentProps<'div'> & {
  passwordRecoveryEnabled?: boolean
}) {
  const t = useTranslations()
  const navigation = useManagerNavigation()
  const { refreshAuth } = useManagerRuntimeAuth()
  const { mutate, isPending } = useManagerMutation('manager.auth.login')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const forgotPasswordHref = navigation.hrefPath?.('/forgot-password') ?? '/forgot-password'

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginInput),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const handleFieldChange =
    (onChange: (...event: unknown[]) => void) =>
    (...event: unknown[]) => {
      onChange(...event)
      form.clearErrors()
    }

  const navigateToManagerRoot = () => {
    if (navigation.replacePath) {
      navigation.replacePath('/')
      return
    }

    navigation.pushPath?.('/')
  }

  const onSubmit = (values: LoginInput) => {
    mutate(values, {
      onSuccess: async (result) => {
        if (typeof result === 'object' && result !== null && 'token' in result) {
          const authenticated = await refreshAuth()

          if (authenticated) {
            navigateToManagerRoot()
          }
        }

        if (typeof result === 'object' && result !== null && 'challenge' in result) {
          const mfaResult = result as {
            challenge: string
            method: string
            expiresAt: string
          }
          navigation.pushPath?.(
            `/mfa?challenge=${mfaResult.challenge}&method=${mfaResult.method}&expiresAt=${mfaResult.expiresAt}`
          )
        }
      },
      onError: (error: unknown) => {
        if (instanceofAppErrorShape(error) && error.key === 'FORBIDDEN') {
          const reason = error.cause.reason
          form.setError('username', {})
          form.setError('password', {
            message:
              reason === 'INVALID_CREDENTIALS'
                ? t('login.invalidCredentials')
                : reason === 'RATE_LIMITED'
                  ? t('login.rateLimited')
                  : t('login.error'),
          })
          return
        }

        form.setError('password', {
          message: t('login.error'),
        })
      },
    })
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <AuthLanguageSelector />
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-6 text-center">
            <a href="#" className="flex flex-col items-center gap-2 font-medium">
              <RakunLogoMark className="h-14 w-auto text-primary" />
              <span className="sr-only">{t('login.brand')}</span>
            </a>
            <h1 className="text-xl font-bold">{t('login.welcome')}</h1>
          </div>
          <Controller
            name="username"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor="email">{t('login.email')}</FieldLabel>
                <Input
                  {...field}
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  required
                  aria-invalid={fieldState.invalid}
                  onChange={handleFieldChange(field.onChange)}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <div className="flex items-center justify-between gap-4">
                  <FieldLabel htmlFor="password">{t('login.password')}</FieldLabel>
                  {passwordRecoveryEnabled ? (
                    <a className="text-sm underline" href={forgotPasswordHref}>
                      {t('login.forgotPassword')}
                    </a>
                  ) : null}
                </div>
                <div className="relative">
                  <Input
                    {...field}
                    autoComplete="current-password"
                    className="pr-10"
                    id="password"
                    type={passwordVisible ? 'text' : 'password'}
                    required
                    aria-invalid={fieldState.invalid}
                    onChange={handleFieldChange(field.onChange)}
                  />
                  <Button
                    aria-label={
                      passwordVisible
                        ? t('login.hidePassword')
                        : t('login.showPassword')
                    }
                    aria-pressed={passwordVisible}
                    className="absolute end-0 top-0"
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    size="icon"
                    title={
                      passwordVisible
                        ? t('login.hidePassword')
                        : t('login.showPassword')
                    }
                    type="button"
                    variant="ghost"
                  >
                    {passwordVisible ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Field>
            <Button loading={isPending} type="submit">
              {t('login.submit')}
            </Button>
          </Field>
          <FieldSeparator>{t('login.or')}</FieldSeparator>
          <Field className="grid gap-4 sm:grid-cols-2">
            <Button variant="outline" type="button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1024"
                height="1024"
                viewBox="0 0 1024 1024"
                fill="none"
              >
                <path
                  d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
                  transform="scale(64)"
                  fill="currentColor"
                />
              </svg>
              {t('login.github')}
            </Button>
            <Button variant="outline" type="button">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              {t('login.google')}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
