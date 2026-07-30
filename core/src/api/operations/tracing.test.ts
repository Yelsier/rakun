import { beforeEach, describe, expect, test } from 'bun:test'
import { z } from 'zod'

import { createEventLogService } from '../../eventLog'
import type { EventLogRecord, EventLogWrite } from '../../eventLog'
import { AppError } from '../../lib/errors'
import { createLogger } from '../../lib/Logger'
import type { RakunRequestContext } from '../context'

import { recordApiError } from './apiErrorLog'
import { traceOperationMap } from './tracing'
import { defineOperation } from './types'

const createContext = (): RakunRequestContext => {
  const user: NonNullable<RakunRequestContext['user']> = {
    _id: '507f1f77bcf86cd799439011',
    _type: 'ManagerUser',
    user: 'api-test',
    email: 'api-test@example.com',
    twoFactorEnabled: false,
    role: {
      _id: '507f1f77bcf86cd799439012',
      _type: 'ManagerRole',
      name: 'API test role',
      permissions: [],
    },
  }

  return {
    req: {
      headers: {
        'x-request-id': 'request-123',
      },
    },
    user,
    getUser: () => user,
  }
}

describe('API operation error logging', () => {
  let events: EventLogWrite[]

  beforeEach(() => {
    events = []
    createLogger({ level: 'fatal' })
    createEventLogService({
      adapter: {
        append: async (event): Promise<EventLogRecord> => {
          events.push(event)
          return { id: `event-${events.length}`, ...event }
        },
        query: async () => ({ items: [] }),
      },
    })
  })

  test('persists failed API operations for the manager log without sensitive causes', async () => {
    const error = new AppError('FORBIDDEN', {
      reason: 'sensitive authorization detail',
    })
    const operations = traceOperationMap({
      'manager.test.failure': defineOperation({
        access: 'auth',
        kind: 'mutation',
        method: 'post',
        output: z.object({ ok: z.boolean() }),
        resolve: async () => {
          throw error
        },
      }),
    })
    const ctx = createContext()

    await expect(
      operations['manager.test.failure'].resolve({
        ctx,
        input: undefined,
      })
    ).rejects.toBe(error)

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'api.operation.failed',
      category: 'api',
      severity: 'warning',
      outcome: 'failure',
      source: '@rakun-kit/core/api',
      correlationId: 'request-123',
      actor: {
        type: 'manager-user',
        id: '507f1f77bcf86cd799439011',
      },
      resource: {
        type: 'api-operation',
        id: 'manager.test.failure',
      },
      tags: ['api', 'error', 'mutation'],
      data: {
        operation: 'manager.test.failure',
        statusCode: 403,
        kind: 'mutation',
        method: 'post',
        errorKey: 'FORBIDDEN',
      },
    })
    expect(JSON.stringify(events[0])).not.toContain('sensitive authorization detail')

    await recordApiError({
      name: 'manager.test.failure',
      operation: operations['manager.test.failure'],
      ctx,
      error,
      boundary: true,
    })

    expect(events).toHaveLength(1)

    await recordApiError({
      name: 'manager.test.failure',
      operation: operations['manager.test.failure'],
      ctx,
      error,
      boundary: true,
    })

    expect(events).toHaveLength(2)
  })

  test('records unexpected errors as server errors without exposing their message', async () => {
    const error = new Error('database password leaked in message')
    const operations = traceOperationMap({
      'web.test.failure': defineOperation({
        access: 'public',
        kind: 'query',
        method: 'get',
        output: z.object({ ok: z.boolean() }),
        resolve: async () => {
          throw error
        },
      }),
    })

    await expect(
      operations['web.test.failure'].resolve({
        ctx: createContext(),
        input: undefined,
      })
    ).rejects.toBe(error)

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      severity: 'error',
      data: {
        statusCode: 500,
        errorName: 'Error',
      },
    })
    expect(JSON.stringify(events[0])).not.toContain('database password leaked in message')
  })

  test('keeps the original API error when persisting its event fails', async () => {
    const error = new Error('original API error')
    createEventLogService({
      adapter: {
        append: async () => {
          throw new Error('event log unavailable')
        },
        query: async () => ({ items: [] }),
      },
    })
    const operations = traceOperationMap({
      'manager.test.logFailure': defineOperation({
        access: 'public',
        kind: 'query',
        method: 'get',
        output: z.object({ ok: z.boolean() }),
        resolve: async () => {
          throw error
        },
      }),
    })

    await expect(
      operations['manager.test.logFailure'].resolve({
        ctx: createContext(),
        input: undefined,
      })
    ).rejects.toBe(error)
  })
})
