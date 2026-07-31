import { describe, expect, test } from 'bun:test'

import { passwordResetMailTemplate } from './passwordResetMailTemplate'

describe('passwordResetMailTemplate', () => {
  test('renders branded HTML and a text fallback', async () => {
    const content = await passwordResetMailTemplate.render({
      expiresAt: new Date('2026-07-30T20:00:00.000Z'),
      resetUrl: 'https://cms.example.com/reset-password?token=test',
      user: {
        email: 'ada@example.com',
        name: 'Ada',
      },
    })

    expect(content.html).toContain('Rakun <span')
    expect(content.html).toContain('#2abb67')
    expect(content.html).toContain('Choose new password')
    expect(content.text).toContain(
      'https://cms.example.com/reset-password?token=test',
    )
  })

  test('escapes user and URL values in HTML', async () => {
    const content = await passwordResetMailTemplate.render({
      expiresAt: new Date('2026-07-30T20:00:00.000Z'),
      resetUrl:
        'https://cms.example.com/reset-password?token=<unsafe>&source=email',
      user: {
        email: 'ada@example.com',
        name: '<script>alert("x")</script>',
      },
    })

    expect(content.html).not.toContain('<script>')
    expect(content.html).toContain(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    )
    expect(content.html).toContain(
      'token=&lt;unsafe&gt;&amp;source=email',
    )
  })
})
