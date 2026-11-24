import { createMailSender } from '@rakun-kit/core'
import { createJsxEmailTemplate } from '@rakun-kit/jsx-email'

import WelcomeEmail from '../emails/WelcomeEmail'

export const previewMailSender = createMailSender({
  templates: {
    welcome: createJsxEmailTemplate({
      component: WelcomeEmail,
      subject: ({ name }) => `Welcome to Rakun, ${name}`,
    }),
  },
})
