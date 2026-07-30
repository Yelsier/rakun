import { describe, expect, mock, test } from 'bun:test'

import type { MailAdapter, MailMessage } from './adapters'
import {
  MailErrorInvalidData,
  MailErrorSendFailed,
  createMailServiceFromAdapter,
} from './mailService'
import { createMailConnection, getMailService, hasMailService, sendMail } from './index'
import { createMailSender, defineMailTemplate } from './templates'
import { createEventLogServiceFromAdapter } from '../eventLog'
import type { EventLogRecord, EventLogWrite } from '../eventLog'

const createAdapter = () => {
  const messages: MailMessage[] = []
  const send = mock(async (message: MailMessage) => {
    messages.push(message)
    return { id: 'mail-1' }
  })
  const adapter: MailAdapter = { send }

  return { adapter, messages, send }
}

describe('mail service', () => {
  test('supports the lazy global connection lifecycle', async () => {
    const { adapter, messages } = createAdapter()

    createMailConnection({
      adapter,
      defaultFrom: 'sender@example.com',
    })

    expect(hasMailService()).toBe(true)
    expect(getMailService().rawAdapter).toBe(adapter)
    await sendMail({
      to: 'recipient@example.com',
      subject: 'Global service',
      text: 'Hello',
    })
    expect(messages[0]?.subject).toBe('Global service')
  })

  test('normalizes addresses and applies defaults', async () => {
    const { adapter, messages } = createAdapter()
    const service = createMailServiceFromAdapter({
      adapter,
      defaultFrom: { address: ' sender@example.com ', name: ' Rakun ' },
      defaultReplyTo: 'replies@example.com',
    })
    const attachment = new Uint8Array([1, 2, 3])

    await expect(
      service.send({
        to: ['one@example.com', { address: 'two@example.com', name: 'Two' }],
        cc: 'copy@example.com',
        bcc: [],
        subject: 'Welcome',
        html: '<p>Hello</p>',
        headers: { 'X-Rakun': 'mail' },
        attachments: [
          {
            filename: ' invoice.pdf ',
            content: attachment,
            contentType: 'application/pdf',
            contentId: 'invoice',
          },
        ],
      })
    ).resolves.toEqual({ id: 'mail-1' })

    expect(messages).toEqual([
      {
        from: { address: 'sender@example.com', name: 'Rakun' },
        to: [{ address: 'one@example.com' }, { address: 'two@example.com', name: 'Two' }],
        cc: [{ address: 'copy@example.com' }],
        bcc: undefined,
        replyTo: [{ address: 'replies@example.com' }],
        subject: 'Welcome',
        html: '<p>Hello</p>',
        text: undefined,
        headers: { 'X-Rakun': 'mail' },
        attachments: [
          {
            filename: 'invoice.pdf',
            content: attachment,
            contentType: 'application/pdf',
            contentId: 'invoice',
          },
        ],
      },
    ])
  })

  test('rejects invalid messages before calling the adapter', async () => {
    const { adapter, send } = createAdapter()
    const service = createMailServiceFromAdapter({ adapter })

    await expect(
      service.send({
        to: [],
        subject: 'No recipients',
        text: 'Hello',
      })
    ).rejects.toBeInstanceOf(MailErrorInvalidData)
    expect(send).not.toHaveBeenCalled()

    await expect(
      service.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'No body',
      })
    ).rejects.toBeInstanceOf(MailErrorInvalidData)
  })

  test('wraps provider failures', async () => {
    const service = createMailServiceFromAdapter({
      defaultFrom: 'sender@example.com',
      adapter: {
        send: async () => {
          throw new Error('Provider unavailable')
        },
      },
    })

    await expect(
      service.send({
        to: 'recipient@example.com',
        subject: 'Hello',
        text: 'Body',
      })
    ).rejects.toBeInstanceOf(MailErrorSendFailed)
  })

  test('persists safe attempt and success events for sent mail', async () => {
    const { adapter: baseAdapter } = createAdapter()
    const adapter: MailAdapter = {
      ...baseAdapter,
      provider: 'test-provider',
    }
    const events: EventLogRecord[] = []
    const eventLog = createEventLogServiceFromAdapter({
      adapter: {
        append: async (event: EventLogWrite) => {
          const record = { id: `event-${events.length + 1}`, ...event }
          events.push(record)
          return record
        },
        query: async () => ({ items: events }),
      },
    })
    const service = createMailServiceFromAdapter({
      adapter,
      eventLog,
      defaultFrom: 'sender@example.com',
    })

    await service.send({
      to: ['private@example.com', 'other@example.com'],
      subject: 'Sensitive subject',
      html: '<p>Private body</p>',
      headers: { Authorization: 'secret' },
      attachments: [
        {
          filename: 'private.pdf',
          content: new Uint8Array([1, 2, 3]),
        },
      ],
      event: {
        template: 'welcome',
        tags: ['transactional'],
      },
    })

    expect(events).toHaveLength(2)
    expect(events.map((event) => event.type)).toEqual([
      'mail.send.attempted',
      'mail.send.succeeded',
    ])
    expect(events[0]?.correlationId).toBe(events[1]?.correlationId)
    expect(events[1]).toMatchObject({
      outcome: 'success',
      resource: { type: 'mail', id: 'mail-1' },
      tags: ['mail', 'transactional'],
      data: {
        provider: 'test-provider',
        recipientCount: 2,
        attachmentCount: 1,
        template: 'welcome',
      },
    })

    const serializedEvents = JSON.stringify(events)
    expect(serializedEvents).not.toContain('private@example.com')
    expect(serializedEvents).not.toContain('Sensitive subject')
    expect(serializedEvents).not.toContain('Private body')
    expect(serializedEvents).not.toContain('Authorization')
    expect(serializedEvents).not.toContain('private.pdf')
  })

  test('records provider failures and refuses unlogged sends', async () => {
    const events: EventLogRecord[] = []
    const failedProvider = mock(async () => {
      throw new Error('provider secret response')
    })
    const eventLog = createEventLogServiceFromAdapter({
      adapter: {
        append: async (event) => {
          const record = { id: `event-${events.length + 1}`, ...event }
          events.push(record)
          return record
        },
        query: async () => ({ items: events }),
      },
    })
    const service = createMailServiceFromAdapter({
      adapter: { send: failedProvider },
      eventLog,
      defaultFrom: 'sender@example.com',
    })

    await expect(
      service.send({
        to: 'recipient@example.com',
        subject: 'Hello',
        text: 'Body',
      })
    ).rejects.toBeInstanceOf(MailErrorSendFailed)

    expect(events.map((event) => event.type)).toEqual(['mail.send.attempted', 'mail.send.failed'])
    expect(JSON.stringify(events)).not.toContain('provider secret response')

    const send = mock(async () => ({ id: 'should-not-send' }))
    const serviceWithoutWritableLog = createMailServiceFromAdapter({
      adapter: { send },
      eventLog: createEventLogServiceFromAdapter({
        adapter: {
          append: async () => {
            throw new Error('log unavailable')
          },
          query: async () => ({ items: [] }),
        },
      }),
      defaultFrom: 'sender@example.com',
    })

    await expect(
      serviceWithoutWritableLog.send({
        to: 'recipient@example.com',
        subject: 'Hello',
        text: 'Body',
      })
    ).rejects.toBeInstanceOf(MailErrorSendFailed)
    expect(send).not.toHaveBeenCalled()
  })
})

describe('mail templates', () => {
  test('renders the selected template and sends its envelope', async () => {
    const { adapter, messages } = createAdapter()
    const service = createMailServiceFromAdapter({
      adapter,
      defaultFrom: 'sender@example.com',
    })
    const sender = createMailSender({
      service,
      templates: {
        welcome: defineMailTemplate<{ name: string }>({
          subject: ({ name }) => `Welcome, ${name}`,
          render: ({ name }) => ({
            html: `<p>Hello ${name}</p>`,
            text: `Hello ${name}`,
          }),
        }),
      },
    })

    await sender.send({
      template: 'welcome',
      props: { name: 'Ada' },
      to: 'ada@example.com',
      headers: { 'X-Template': 'welcome' },
    })

    expect(messages[0]).toMatchObject({
      subject: 'Welcome, Ada',
      html: '<p>Hello Ada</p>',
      text: 'Hello Ada',
      to: [{ address: 'ada@example.com' }],
      headers: { 'X-Template': 'welcome' },
    })
  })
})
