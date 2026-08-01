# `@rakun-kit/resend` AI usage manual

Use this package to deliver Rakun mail through Resend. Read the mail section of
`node_modules/@rakun-kit/core/dist/docs/index.md` first.

## Install and configure

```sh
bun add @rakun-kit/resend
```

```ts
import { rakunBootstrap } from '@rakun-kit/core'
import { createResendMailServiceConfig } from '@rakun-kit/resend'

rakunBootstrap({
  // other options
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

The `defaultFrom` domain must be verified in Resend. Keep the API key in a
server-only environment variable.

Rakun passes already-rendered HTML and text to this adapter. Resend hosted
templates and its React input are intentionally not part of this API; use
`@rakun-kit/jsx-email` to render portable JSX templates before delivery.

The only public entrypoint is `@rakun-kit/resend`. Provider failures are wrapped
as `MailErrorSendFailed`. Let the core mail service own delivery calls and its
persistent attempted/succeeded/failed events rather than calling Resend around
that service.
