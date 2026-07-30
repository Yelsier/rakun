import type { MailAdapter } from '../src/mail/adapters'
import { createMailServiceFromAdapter } from '../src/mail/mailService'
import { createMailSender, defineMailTemplate } from '../src/mail/templates'

const adapter: MailAdapter = {
  send: async () => ({ id: 'type-test' }),
}
const service = createMailServiceFromAdapter({
  adapter,
  defaultFrom: 'sender@example.com',
})
const sender = createMailSender({
  service,
  templates: {
    welcome: defineMailTemplate<{ name: string; activationUrl: string }>({
      subject: ({ name }) => `Welcome, ${name}`,
      render: ({ activationUrl }) => ({ text: activationUrl }),
    }),
    receipt: defineMailTemplate<{ total: number }>({
      subject: 'Receipt',
      render: ({ total }) => ({ text: String(total) }),
    }),
  },
})

void sender.send({
  template: 'welcome',
  props: { name: 'Ada', activationUrl: 'https://example.com' },
  to: 'ada@example.com',
})

void sender.send({
  template: 'receipt',
  props: { total: 20 },
  to: 'ada@example.com',
})

void sender.send({
  template: 'welcome',
  // @ts-expect-error Welcome requires activationUrl.
  props: { name: 'Ada' },
  to: 'ada@example.com',
})

void sender.send({
  // @ts-expect-error Unknown template key.
  template: 'missing',
  // @ts-expect-error Unknown templates cannot accept props.
  props: {},
  to: 'ada@example.com',
})
