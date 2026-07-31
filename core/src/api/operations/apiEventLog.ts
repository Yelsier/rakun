import { getEventLogService, hasEventLogService } from '../../eventLog'
import { getAppErrorShape, getAppErrorStatusCode } from '../../lib/errors'
import { Logger } from '../../lib/Logger'
import type { EventLogJsonValue } from '../../eventLog'
import type { RakunRequestContext } from '../context'

import type { AnyRakunOperation } from './types'

const loggedApiErrors = new WeakSet<object>()
const apiErrorEventData = new WeakMap<
  RakunRequestContext,
  Record<string, EventLogJsonValue>
>()
const apiSuccessEventData = new WeakMap<
  RakunRequestContext,
  Record<string, EventLogJsonValue>
>()

export const setApiErrorEventData = (
  ctx: RakunRequestContext | undefined,
  data: Record<string, EventLogJsonValue>,
) => {
  if (ctx) apiErrorEventData.set(ctx, data)
}

export const setApiSuccessEventData = (
  ctx: RakunRequestContext,
  data: Record<string, EventLogJsonValue>
) => {
  apiSuccessEventData.set(ctx, data)
}

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

const getActor = (ctx: RakunRequestContext | undefined) =>
  ctx?.user?._id
    ? { type: 'manager-user', id: String(ctx.user._id) }
    : { type: 'anonymous' }

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
  const contextualData = ctx ? apiErrorEventData.get(ctx) : undefined
  if (ctx) apiErrorEventData.delete(ctx)

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
      actor: getActor(ctx),
      resource: { type: 'api-operation', id: name },
      tags: ['api', 'error', ...(operation ? [operation.kind] : [])],
      data: {
        operation: name,
        statusCode: resolvedStatusCode,
        ...(operation ? { kind: operation.kind, method: operation.method } : {}),
        ...(appError ? { errorKey: appError.key } : {}),
        ...(errorName ? { errorName } : {}),
        ...(contextualData ? { context: contextualData } : {}),
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

export type ApiOperationSuccessLogInput = {
  name: string
  operation: Pick<AnyRakunOperation, 'kind' | 'method'>
  ctx: RakunRequestContext
}

export const recordApiOperationSuccess = async ({
  name,
  operation,
  ctx,
}: ApiOperationSuccessLogInput): Promise<void> => {
  if (operation.kind !== 'mutation') {
    return
  }

  const contextualData = apiSuccessEventData.get(ctx)
  apiSuccessEventData.delete(ctx)

  if (!hasEventLogService()) {
    Logger?.error?.(
      'API mutation success could not be persisted because the event log is not initialized',
      { operation: name }
    )
    return
  }

  try {
    const namespace = name.split('.')[0] || 'api'

    await getEventLogService().record({
      type: `${name}.succeeded`,
      category: 'api',
      severity: 'info',
      outcome: 'success',
      source: '@rakun-kit/core/api',
      correlationId: getCorrelationId(ctx),
      actor: getActor(ctx),
      resource: { type: 'api-operation', id: name },
      tags: ['api', 'mutation', 'success', namespace],
      data: {
        operation: name,
        kind: operation.kind,
        method: operation.method,
        ...(contextualData ? { context: contextualData } : {}),
      },
    })
  } catch (error) {
    Logger?.error?.('API mutation success event could not be persisted', {
      operation: name,
      error,
    })
  }
}
