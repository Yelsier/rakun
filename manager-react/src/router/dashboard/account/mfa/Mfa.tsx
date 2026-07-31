'use client'

import type { AccountInfoOutput } from '@rakun-kit/core/contracts'

import { Button } from '@/components/ui/button'
import { useTranslations } from '@/i18n'
import { MfaEnroller } from './MfaEnroller'
import { RecoveryCodesRegenerator } from './RecoveryCodesRegenerator'

export default function Mfa(props: AccountInfoOutput) {
  const t = useTranslations()
  return (
    <div className='flex w-full flex-col gap-4' data-tour='account-mfa'>
      <div className='flex w-full items-start justify-between gap-4'>
        <div>
          <h2 className='mb-4 text-xl font-bold'>{t('account.mfa.title')}</h2>
          <p className='mb-4'>
            {props.has2FA
              ? t('account.mfa.enabledWithMethod', {
                  method: props.method2FA.toUpperCase(),
                })
              : t('account.mfa.notEnabled')}
          </p>
          {props.has2FA ? (
            <p className='text-muted-foreground max-w-xl text-sm'>
              {t('account.mfa.noBypassWarning')}
            </p>
          ) : null}
        </div>
        <div className='flex flex-wrap justify-end gap-2'>
          {props.has2FA ? <RecoveryCodesRegenerator /> : null}
          <MfaEnroller>
            <Button variant='outline'>
              {props.has2FA
                ? t('account.mfa.updateAction')
                : t('account.mfa.setupAction')}
            </Button>
          </MfaEnroller>
        </div>
      </div>
    </div>
  )
}
