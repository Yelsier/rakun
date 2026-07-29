# @rakun-kit/jsx-email

ESM-only JSX Email renderer for Rakun's typed mail templates.

## Setup

```sh
bun add @rakun-kit/jsx-email jsx-email react react-dom
```

JSX Email 3 requires Node.js 22+ and React 19.2+. Define each previewable
component in its own file:

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

export const Template = ({ name, activationUrl }: WelcomeEmailProps) => (
  <Html>
    <Body>
      <Text>Hello {name}</Text>
      <a href={activationUrl}>Activate account</a>
    </Body>
  </Html>
)

export default Template
```

Register it with a subject. The component's props are preserved by
`createMailSender`:

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

await mail.send({
  template: 'welcome',
  props: {
    name: 'Ada',
    activationUrl: 'https://example.com/activate',
  },
  to: 'ada@example.com',
})
```

HTML and plain text are rendered automatically. Pass `text: false` for
HTML-only output, or a function to provide custom plain text. `renderOptions`
accepts JSX Email render options other than `plainText`.

## Preview

```sh
bunx email preview emails
bunx email check emails/WelcomeEmail.tsx --use-preview-props
```

The preview server reads the component's named `previewProps` export.
