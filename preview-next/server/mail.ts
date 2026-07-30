import { createMailSender } from '@rakun-kit/core'
import { createJsxEmailTemplate } from '@rakun-kit/jsx-email'

import TestEmail from '../emails/TestEmail'

export const testMailSender = createMailSender({
  templates: {
    test: createJsxEmailTemplate({
      component: TestEmail,
      subject: ({ name }) => `Rakun mail test for ${name}`,
    }),
  },
})
