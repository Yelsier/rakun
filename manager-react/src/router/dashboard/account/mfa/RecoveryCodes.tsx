'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useTranslations } from '@/i18n'

export const RecoveryCodes = ({
  codes,
  onDone,
}: {
  codes: string[]
  onDone: () => void
}) => {
  const t = useTranslations()
  const [copied, setCopied] = useState(false)

  return (
    <div className='space-y-4'>
      <div>
        <h3 className='font-semibold'>{t('account.mfa.recoveryCodesTitle')}</h3>
        <p className='text-muted-foreground mt-1 text-sm'>
          {t('account.mfa.recoveryCodesDescription')}
        </p>
      </div>
      <div className='grid grid-cols-1 gap-2 rounded-md border bg-muted/30 p-3 font-mono text-sm sm:grid-cols-2'>
        {codes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </div>
      <p className='text-muted-foreground text-sm'>
        {t('account.mfa.noBypassWarning')}
      </p>
      <div className='flex flex-col gap-2 sm:flex-row'>
        <Button
          className='flex-1'
          onClick={() => {
            void navigator.clipboard.writeText(codes.join('\n')).then(() => {
              setCopied(true)
            })
          }}
          type='button'
          variant='outline'
        >
          {copied ? <Check /> : <Copy />}
          {copied
            ? t('account.mfa.recoveryCodesCopied')
            : t('account.mfa.copyRecoveryCodes')}
        </Button>
        <Button className='flex-1' onClick={onDone} type='button'>
          {t('account.mfa.savedRecoveryCodes')}
        </Button>
      </div>
    </div>
  )
}
