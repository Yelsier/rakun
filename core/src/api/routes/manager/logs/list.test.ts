import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { createEventLogService, type EventLogQuery } from '../../../../eventLog'
import { createLogger } from '../../../../lib/Logger'
import { listEventLogsHandler } from './list'

const query = mock(async (_input: EventLogQuery) => ({
  items: [
    {
      id: 'event-1',
      type: 'mail.send.succeeded',
      category: 'mail',
      occurredAt: new Date('2026-07-29T10:15:00.000Z'),
      severity: 'info' as const,
      outcome: 'success' as const,
      source: '@rakun-kit/core/mail',
      correlationId: 'mail-1',
      actor: { type: 'system' },
      resource: { type: 'mail', id: 'provider-message-1' },
      tags: ['mail'],
      data: { provider: 'resend', recipientCount: 1 },
    },
  ],
  nextCursor: 'next-page',
}))

const createContext = (permissions: string[]) =>
  ({
    getUser: () => ({
      _id: '507f1f77bcf86cd799439011',
      _type: 'ManagerUser',
      user: 'Ada',
      email: 'ada@example.com',
      role: {
        _id: '507f1f77bcf86cd799439012',
        name: 'Operator',
        permissions,
      },
    }),
  }) as never

describe('manager event logs', () => {
  beforeEach(() => {
    query.mockClear()
    createLogger({ level: 'fatal' })
    createEventLogService({
      adapter: {
        append: async (event) => ({ id: 'event-new', ...event }),
        query,
      },
    })
  })

  test('lists filtered events for users with the event log permission', async () => {
    const result = await listEventLogsHandler({
      ctx: createContext(['system.eventLog.read']),
      input: {
        categories: ['mail'],
        outcomes: ['success'],
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-31T23:59:59.999Z',
        limit: 25,
      },
    })

    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0]?.[0]).toMatchObject({
      categories: ['mail'],
      outcomes: ['success'],
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-31T23:59:59.999Z'),
      limit: 25,
    })
    expect(result).toMatchObject({
      nextCursor: 'next-page',
      items: [
        {
          id: 'event-1',
          occurredAt: '2026-07-29T10:15:00.000Z',
          type: 'mail.send.succeeded',
        },
      ],
    })
  })

  test('rejects users without the event log permission', async () => {
    await expect(
      listEventLogsHandler({
        ctx: createContext([]),
        input: { limit: 50 },
      })
    ).rejects.toMatchObject({
      statusCode: 403,
    })

    expect(query).not.toHaveBeenCalled()
  })
})
