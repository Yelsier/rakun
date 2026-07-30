import {
  getEventLogService,
  hasEventLogService,
  type EventLogInput,
} from '../../eventLog'
import { Logger } from '../../lib/Logger'
import type { RakunRequestContext } from '../context'

const getCorrelationId = (ctx?: RakunRequestContext) => {
  const value = ctx?.req?.headers?.['x-request-id']
  return Array.isArray(value) ? value[0] : value
}

export const recordAuthEvent = async (
  event: Omit<
    EventLogInput,
    'category' | 'source' | 'correlationId' | 'tags'
  > & {
    ctx?: RakunRequestContext
    tags?: readonly string[]
  },
) => {
  if (!hasEventLogService()) return

  const { ctx, tags, ...input } = event

  try {
    await getEventLogService().record({
      ...input,
      category: 'auth',
      source: '@rakun-kit/core/auth',
      correlationId: getCorrelationId(ctx),
      tags: ['auth', ...(tags ?? [])],
    })
  } catch (error) {
    Logger?.error?.('Authentication event could not be persisted', {
      eventType: event.type,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
  }
}
