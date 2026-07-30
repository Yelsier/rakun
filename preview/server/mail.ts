import { createMailSender } from '@rakun-kit/core'
import { createJsxEmailTemplate } from '@rakun-kit/jsx-email'

import WelcomeEmail from '../emails/WelcomeEmail'
import PasswordResetEmail from '../emails/PasswordResetEmail'

export const passwordResetEmailTemplate = createJsxEmailTemplate({
  component: PasswordResetEmail,
  subject: 'Reset your Rakun manager password',
})

export const previewMailSender = createMailSender({
  templates: {
    welcome: createJsxEmailTemplate({
      component: WelcomeEmail,
      subject: ({ name }) => `Welcome to Rakun, ${name}`,
    }),
  },
})
