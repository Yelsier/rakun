# `@rakun-kit/jsx-email` AI usage manual

Use this ESM-only package to turn typed React/JSX Email components into Rakun
mail templates with HTML and plain-text output.

## Requirements and setup

```sh
bun add @rakun-kit/jsx-email jsx-email react react-dom
```

JSX Email 3 requires Node.js 22+ and React 19.2+. Keep each previewable email
component in its own file and export `previewProps` for the preview CLI.

```tsx
// emails/WelcomeEmail.tsx
import { Body, Html, Text } from 'jsx-email'

export type WelcomeEmailProps = {
  name: string
  activationUrl: string
}

export const previewProps = {
  name: 'Ada',
  activationUrl: 'https://example.com/activate',
} satisfies WelcomeEmailProps

export default function WelcomeEmail(props: WelcomeEmailProps) {
  return (
    <Html>
      <Body>
        <Text>Hello {props.name}</Text>
        <a href={props.activationUrl}>Activate account</a>
      </Body>
    </Html>
  )
}
```

Register the renderer through the core typed sender:

```tsx
import { createMailSender } from '@rakun-kit/core'
import { createJsxEmailTemplate } from '@rakun-kit/jsx-email'
import WelcomeEmail from './emails/WelcomeEmail'

export const mail = createMailSender({
  templates: {
    welcome: createJsxEmailTemplate({
      component: WelcomeEmail,
      subject: ({ name }) => `Welcome, ${name}`,
    }),
  },
})
```

`createMailSender` preserves each component's prop type. HTML and text are
rendered automatically. Pass `text: false` for HTML-only output or a function
for custom plain text. Use `renderOptions` for JSX Email render options other
than `plainText`.

Preview with `bunx email preview emails` and validate a template with
`bunx email check emails/WelcomeEmail.tsx --use-preview-props`.

The only public entrypoint is `@rakun-kit/jsx-email`. It renders templates but
does not deliver mail; configure `@rakun-kit/smtp` or `@rakun-kit/resend` as the
core mail service. Do not import this server-side renderer into browser code.
