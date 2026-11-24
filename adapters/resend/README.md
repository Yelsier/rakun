# @rakun-kit/resend

Resend adapter for Rakun mail.

```sh
bun add @rakun-kit/resend
```

```ts
import { rakunBootstrap } from '@rakun-kit/core'
import { createResendMailServiceConfig } from '@rakun-kit/resend'

rakunBootstrap({
  // ...
  mail: createResendMailServiceConfig({
    apiKey: process.env.RESEND_API_KEY!,
    defaultFrom: {
      name: 'Rakun',
      address: 'hello@example.com',
    },
    defaultReplyTo: 'support@example.com',
  }),
})
```

The adapter always receives already-rendered HTML/text from Rakun. Resend's
hosted templates and `react` input are intentionally not exposed, keeping
application templates portable between providers.

The sender domain used by `defaultFrom` must be verified in Resend. API errors
are passed to the core service and wrapped as `MailErrorSendFailed`.
