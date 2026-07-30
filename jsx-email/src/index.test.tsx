import { describe, expect, test } from 'bun:test'
import { Body, Html, Text } from 'jsx-email'

import { createJsxEmailTemplate } from './index'

type WelcomeProps = {
  name: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html>
    <Body>
      <Text>Hello {name}</Text>
    </Body>
  </Html>
)

describe('createJsxEmailTemplate', () => {
  test('renders HTML and generated plain text', async () => {
    const template = createJsxEmailTemplate({
      component: WelcomeEmail,
      subject: ({ name }) => `Welcome, ${name}`,
    })

    expect(
      typeof template.subject === 'function'
        ? await template.subject({ name: 'Ada' })
        : template.subject
    ).toBe('Welcome, Ada')

    const content = await template.render({ name: 'Ada' })

    expect(content.html).toContain('Hello Ada')
    expect(content.text).toContain('Hello Ada')
    expect(content.text).not.toContain('<')
  })

  test('supports custom and disabled plain text', async () => {
    const custom = createJsxEmailTemplate({
      component: WelcomeEmail,
      subject: 'Welcome',
      text: ({ name }) => `Custom ${name}`,
    })
    const htmlOnly = createJsxEmailTemplate({
      component: WelcomeEmail,
      subject: 'Welcome',
      text: false,
    })

    await expect(custom.render({ name: 'Ada' })).resolves.toMatchObject({
      text: 'Custom Ada',
    })
    await expect(htmlOnly.render({ name: 'Ada' })).resolves.toMatchObject({
      text: undefined,
    })
  })
})
