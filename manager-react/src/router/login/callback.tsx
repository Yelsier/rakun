'use client'

import { useEffect, useRef, useState } from 'react'

import { useManagerMutation } from '@/client/react'
import { useTranslations } from '@/i18n'
import { useManagerNavigation } from '@/state/navigation'
import { Button } from '@/components/ui/button'
import { RakunLogoMark } from '@/components/rakun-logo'

export const ManagerLoginCallbackScreen = ({
  provider,
  code,
  state,
  error,
}: {
  provider?: string
  code?: string
  state?: string
  error?: string
}) => {
  const t = useTranslations()
  const navigation = useManagerNavigation()
  const complete = useManagerMutation('manager.auth.external.complete')
  const started = useRef(false)
  const [failed, setFailed] = useState(Boolean(error || !provider || !code || !state))

  useEffect(() => {
    if (started.current || failed || !provider || !code || !state) return
    started.current = true

    void complete
      .mutateAsync({ provider, code, state })
      .then((result) => {
        if ('challenge' in result) {
          const params = new URLSearchParams({
            challenge: result.challenge,
            method: result.method,
            expiresAt: result.expiresAt,
          })
          const path = `/mfa?${params.toString()}`
          window.location.href = navigation.hrefPath?.(path) ?? path
          return
        }

        window.location.href = navigation.hrefPath?.('/') ?? '/'
      })
      .catch(() => setFailed(true))
  }, [code, complete, failed, navigation, provider, state])

  const loginHref = navigation.hrefPath?.('/login') ?? '/login'

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <RakunLogoMark className="h-14 w-auto text-primary" />
      <h1 className="text-xl font-bold">
        {failed ? t('login.externalError') : t('login.externalCompleting')}
      </h1>
      {failed ? (
        <Button asChild>
          <a href={loginHref}>{t('login.back')}</a>
        </Button>
      ) : null}
    </div>
  )
}
