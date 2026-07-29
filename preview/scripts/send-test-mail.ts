import { createMailService } from '@rakun-kit/core'
import { createResendMailServiceConfig } from '@rakun-kit/resend'

import { previewProps } from '../emails/WelcomeEmail'
import '../server/env'
import { previewMailSender } from '../server/mail'

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is required in preview/.env`)
  }

  return value
}

createMailService(
  createResendMailServiceConfig({
    apiKey: requireEnv('RESEND_API_KEY'),
    defaultFrom: requireEnv('RAKUN_MAIL_FROM'),
  })
)
const result = await previewMailSender.send({
  template: 'welcome',
  props: previewProps,
  to: requireEnv('RAKUN_MAIL_TO'),
})

console.log(`[preview] Test mail accepted with id ${result.id}`)
