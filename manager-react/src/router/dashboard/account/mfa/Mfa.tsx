'use client'

import type { AccountInfoOutput } from '@rakun-kit/core/contracts'

import { Button } from '@/components/ui/button'
import { useTranslations } from '@/i18n'
import { MfaEnroller } from './MfaEnroller'

export default function Mfa(props: AccountInfoOutput) {
  const t = useTranslations()
  return (
    <div className='flex w-full flex-col gap-4' data-tour='account-mfa'>
      <div className='flex w-full items-start justify-between gap-4'>
        <div>
          <h2 className='mb-4 text-xl font-bold'>{t('account.mfa.title')}</h2>
          <p className='mb-4'>
            {props.has2FA
              ? `You have 2FA enabled using ${props.method2FA.toUpperCase()}.`
              : 'You do not have 2FA enabled.'}
          </p>
        </div>
        <MfaEnroller>
          <Button variant='outline'>
            {props.has2FA ? 'Update 2FA' : 'Set up 2FA'}
          </Button>
        </MfaEnroller>
      </div>
    </div>
  )
}
