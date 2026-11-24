import { describe, expect, test } from 'bun:test'

import type { MailMessage } from '@rakun-kit/core'

import { SmtpMailAdapter, createSmtpMailServiceConfig } from './index'

const message: MailMessage = {
  from: { address: 'sender@example.com', name: 'Rakun' },
  to: [{ address: 'one@example.com' }],
  cc: [{ address: 'copy@example.com', name: 'Copy' }],
  bcc: [{ address: 'blind@example.com' }],
  replyTo: [{ address: 'reply@example.com' }],
  subject: 'Welcome',
  html: '<p>Hello</p>',
  text: 'Hello',
  headers: { 'X-Rakun': 'mail' },
  attachments: [
    {
      filename: 'invoice.pdf',
      content: new Uint8Array([1, 2, 3]),
      contentType: 'application/pdf',
      contentId: 'invoice',
    },
  ],
}

describe('SmtpMailAdapter', () => {
  test('maps the normalized message to Nodemailer', async () => {
    const calls: Record<string, unknown>[] = []
    const adapter = new SmtpMailAdapter('smtp://localhost', {
      sendMail: async (input: Record<string, unknown>) => {
        calls.push(input)
        return {
          messageId: 'smtp-1',
          accepted: ['one@example.com'],
          rejected: ['bad@example.com'],
        }
      },
    } as never)

    await expect(adapter.send(message)).resolves.toEqual({
      id: 'smtp-1',
      accepted: [{ address: 'one@example.com' }],
      rejected: [{ address: 'bad@example.com' }],
    })
    expect(calls[0]).toMatchObject({
      from: 'Rakun <sender@example.com>',
      to: ['one@example.com'],
      cc: ['Copy <copy@example.com>'],
      bcc: ['blind@example.com'],
      replyTo: ['reply@example.com'],
      subject: 'Welcome',
      html: '<p>Hello</p>',
      text: 'Hello',
      headers: { 'X-Rakun': 'mail' },
    })
    expect(calls[0]?.attachments).toEqual([
      {
        filename: 'invoice.pdf',
        content: Buffer.from([1, 2, 3]),
        contentType: 'application/pdf',
        cid: 'invoice',
      },
    ])
  })

  test('creates a core service config', () => {
    const config = createSmtpMailServiceConfig({
      transport: 'smtp://localhost',
      defaultFrom: 'sender@example.com',
      defaultReplyTo: 'reply@example.com',
    })

    expect(config.adapter).toBeInstanceOf(SmtpMailAdapter)
    expect(config.defaultFrom).toBe('sender@example.com')
    expect(config.defaultReplyTo).toBe('reply@example.com')
  })
})
