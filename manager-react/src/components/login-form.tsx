'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { instanceofAppErrorShape, loginInput, type LoginInput } from '@rakun-kit/core/client'
import { Eye, EyeOff, Github, LogIn } from 'lucide-react'
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
import type { ManagerLoginConfig } from '@/router/shared/types'

export function LoginForm({
  className,
  passwordRecoveryEnabled = false,
  login = { password: true, adapters: [] },
  ...props
}: React.ComponentProps<'div'> & {
  passwordRecoveryEnabled?: boolean
  login?: ManagerLoginConfig
}) {
  const t = useTranslations()
  const navigation = useManagerNavigation()
  const { refreshAuth } = useManagerRuntimeAuth()
  const { mutate, isPending } = useManagerMutation('manager.auth.login')
  const externalLogin = useManagerMutation('manager.auth.external.start')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [externalError, setExternalError] = useState<string>()
  const [pendingProvider, setPendingProvider] = useState<string>()
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

  const startExternalLogin = (provider: string) => {
    setExternalError(undefined)
    setPendingProvider(provider)
    externalLogin.mutate(
      { provider },
      {
        onSuccess: ({ url }) => window.location.assign(url),
        onError: () => {
          setPendingProvider(undefined)
          setExternalError(t('login.externalError'))
        },
      }
    )
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
          {login.password ? (
            <>
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
                          passwordVisible ? t('login.hidePassword') : t('login.showPassword')
                        }
                        aria-pressed={passwordVisible}
                        className="absolute end-0 top-0"
                        onClick={() => setPasswordVisible((visible) => !visible)}
                        size="icon"
                        title={passwordVisible ? t('login.hidePassword') : t('login.showPassword')}
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
            </>
          ) : null}
          {login.password && login.adapters.length > 0 ? (
            <FieldSeparator>{t('login.or')}</FieldSeparator>
          ) : null}
          {login.adapters.length > 0 ? (
            <Field className="flex w-full flex-col gap-4">
              {login.adapters.map((adapter) => (
                <Button
                  key={adapter.id}
                  className="w-full"
                  disabled={externalLogin.isPending}
                  loading={pendingProvider === adapter.id}
                  onClick={() => startExternalLogin(adapter.id)}
                  variant="outline"
                  type="button"
                >
                  <AdapterIcon icon={adapter.icon} />
                  {adapter.label}
                </Button>
              ))}
              {externalError ? <FieldError>{externalError}</FieldError> : null}
            </Field>
          ) : null}
        </FieldGroup>
      </form>
    </div>
  )
}

const AdapterIcon = ({ icon }: { icon: ManagerLoginConfig['adapters'][number]['icon'] }) => {
  if (icon === 'github') return <Github />

  if (icon === 'google') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path
          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
          fill="currentColor"
        />
      </svg>
    )
  }

  if (icon === 'microsoft') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M2 2h9v9H2zM13 2h9v9h-9zM2 13h9v9H2zM13 13h9v9h-9z" fill="currentColor" />
      </svg>
    )
  }

  return <LogIn />
}
