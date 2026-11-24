# @rakun-kit/smtp

Nodemailer SMTP adapter for Rakun mail.

```sh
bun add @rakun-kit/smtp nodemailer
```

Configure it during bootstrap with an SMTP URL:

```ts
import { rakunBootstrap } from '@rakun-kit/core'
import { createSmtpMailServiceConfig } from '@rakun-kit/smtp'

rakunBootstrap({
  // ...
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

`transport` also accepts Nodemailer's `SMTPTransport.Options`, including
host, port, TLS, authentication and pooling settings.

The adapter supports HTML and text bodies, To/CC/BCC/Reply-To, custom headers,
binary attachments and CID inline attachments.
