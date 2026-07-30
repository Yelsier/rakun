import { getEventLogService, hasEventLogService } from '../../eventLog'
import { getAppErrorShape, getAppErrorStatusCode } from '../../lib/errors'
import { Logger } from '../../lib/Logger'
import type { RakunRequestContext } from '../context'

import type { AnyRakunOperation } from './types'

const loggedApiErrors = new WeakSet<object>()

const getHeaderValue = (
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string
): string | undefined => {
  const value = headers?.[name]
  return Array.isArray(value) ? value[0] : value
}

const getCorrelationId = (ctx: RakunRequestContext | undefined) => {
  const headers = ctx?.req?.headers

  return getHeaderValue(headers, 'x-correlation-id') ?? getHeaderValue(headers, 'x-request-id')
}

const getErrorName = (error: unknown): string | undefined => {
  if (error instanceof Error && error.name.trim()) {
    return error.name
  }

  return undefined
}

const isObjectError = (error: unknown): error is object =>
  (typeof error === 'object' && error !== null) || typeof error === 'function'

export type ApiErrorLogInput = {
  name: string
  operation?: Pick<AnyRakunOperation, 'kind' | 'method'>
  ctx?: RakunRequestContext
  error: unknown
  statusCode?: number
  /**
   * Marks the outer API adapter boundary. It clears propagation deduplication
   * so a reused Error object can still be recorded by a later request.
   */
  boundary?: boolean
}

export const recordApiError = async ({
  name,
  operation,
  ctx,
  error,
  statusCode,
  boundary = false,
}: ApiErrorLogInput): Promise<void> => {
  if (isObjectError(error) && loggedApiErrors.has(error)) {
    if (boundary) {
      loggedApiErrors.delete(error)
    }
    return
  }

  const appError = getAppErrorShape(error)
  const resolvedStatusCode = statusCode ?? getAppErrorStatusCode(error) ?? 500
  const errorName = appError ? undefined : getErrorName(error)

  if (!hasEventLogService()) {
    Logger?.error?.('API error could not be persisted because the event log is not initialized', {
      operation: name,
      statusCode: resolvedStatusCode,
    })
    return
  }

  try {
    await getEventLogService().record({
      type: 'api.operation.failed',
      category: 'api',
      severity: resolvedStatusCode >= 500 ? 'error' : 'warning',
      outcome: 'failure',
      source: '@rakun-kit/core/api',
      correlationId: getCorrelationId(ctx),
      actor: ctx?.user?._id
        ? { type: 'manager-user', id: String(ctx.user._id) }
        : { type: 'anonymous' },
      resource: { type: 'api-operation', id: name },
      tags: ['api', 'error', ...(operation ? [operation.kind] : [])],
      data: {
        operation: name,
        statusCode: resolvedStatusCode,
        ...(operation ? { kind: operation.kind, method: operation.method } : {}),
        ...(appError ? { errorKey: appError.key } : {}),
        ...(errorName ? { errorName } : {}),
      },
    })

    if (isObjectError(error) && !boundary) {
      loggedApiErrors.add(error)
    }
  } catch (logError) {
    Logger?.error?.('API error event could not be persisted', {
      operation: name,
      statusCode: resolvedStatusCode,
      error: logError,
    })
  }
}
