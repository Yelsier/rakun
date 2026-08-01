# `@rakun-kit/smtp` AI usage manual

Use this package to deliver Rakun mail through SMTP with Nodemailer. Read the
mail section of `node_modules/@rakun-kit/core/dist/docs/index.md` first.

## Install and configure

```sh
bun add @rakun-kit/smtp nodemailer
```

```ts
import { rakunBootstrap } from '@rakun-kit/core'
import { createSmtpMailServiceConfig } from '@rakun-kit/smtp'

rakunBootstrap({
  // other options
  mail: createSmtpMailServiceConfig({
    transport: process.env.SMTP_URL!,
    defaultFrom: {
      name: 'Rakun',
      address: 'hello@example.com',
    },
    defaultReplyTo: 'support@example.com',
  }),
})
```

`transport` accepts an SMTP URL or Nodemailer's `SMTPTransport.Options`,
including host, port, TLS, auth and pooling. Keep credentials in server-only
environment variables.

The adapter accepts already-rendered HTML/text, To/CC/BCC/Reply-To, custom
headers, binary attachments and CID inline attachments. Use
`@rakun-kit/jsx-email` when typed JSX templates are desired.

The only public entrypoint is `@rakun-kit/smtp`. Let the core mail service own
delivery calls and persistent attempted/succeeded/failed events; do not call the
underlying Nodemailer transport in a way that bypasses Rakun's service.
