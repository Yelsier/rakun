import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { createEventLogService } from '../../../../eventLog'
import { createLogger } from '../../../../lib/Logger'
import { cleanupEventLogsHandler } from './cleanup'

const deleteBefore = mock(async (_before: Date) => 9)

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

describe('manager event log cleanup', () => {
  beforeEach(() => {
    deleteBefore.mockClear()
    createLogger({ level: 'fatal' })
    createEventLogService({
      adapter: {
        append: async (event) => ({ id: 'event-new', ...event }),
        query: async () => ({ items: [] }),
        deleteBefore,
      },
    })
  })

  test('deletes events before the cutoff for authorized users', async () => {
    const result = await cleanupEventLogsHandler({
      ctx: createContext(['system.eventLog.manage']),
      input: { before: '2026-07-01T00:00:00.000Z' },
    })

    expect(deleteBefore).toHaveBeenCalledWith(new Date('2026-07-01T00:00:00.000Z'))
    expect(result).toEqual({ deletedCount: 9 })
  })

  test('rejects users without the cleanup permission', async () => {
    await expect(
      cleanupEventLogsHandler({
        ctx: createContext(['system.eventLog.read']),
        input: { before: '2026-07-01T00:00:00.000Z' },
      })
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(deleteBefore).not.toHaveBeenCalled()
  })
})
