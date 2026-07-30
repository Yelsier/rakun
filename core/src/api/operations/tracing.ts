import type { RakunRequestContext } from '../context'
import { Logger } from '../../lib/Logger'

import { recordApiError, recordApiOperationSuccess } from './apiEventLog'
import type { AnyRakunOperation, RakunOperationMap } from './types'

const operationTracingSymbol = Symbol.for('rakun.operation.tracing')
const REDACTED_TRACE_VALUE = '[redacted]'
const CIRCULAR_TRACE_VALUE = '[circular]'
const MAX_TRACE_INPUT_DEPTH = 6
const MAX_TRACE_ARRAY_ITEMS = 25
const MAX_TRACE_STRING_LENGTH = 500

type TraceableOperation = AnyRakunOperation & {
  [operationTracingSymbol]?: true
}

const sensitiveTraceKeyPattern =
  /(authorization|challenge|cookie|credential|password|secret|session|token|totp|webauthn)/i

const sanitizeTraceValue = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    return value.length > MAX_TRACE_STRING_LENGTH
      ? `${value.slice(0, MAX_TRACE_STRING_LENGTH)}...`
      : value
  }

  if (typeof value !== 'object') {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return '[binary]'
  }

  if (seen.has(value)) {
    return CIRCULAR_TRACE_VALUE
  }

  if (depth >= MAX_TRACE_INPUT_DEPTH) {
    return '[max-depth]'
  }

  seen.add(value)

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_TRACE_ARRAY_ITEMS)
      .map((item) => sanitizeTraceValue(item, depth + 1, seen))

    if (value.length > MAX_TRACE_ARRAY_ITEMS) {
      items.push(`[truncated:${value.length - MAX_TRACE_ARRAY_ITEMS}]`)
    }

    return items
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveTraceKeyPattern.test(key)
        ? REDACTED_TRACE_VALUE
        : sanitizeTraceValue(item, depth + 1, seen),
    ])
  )
}

const addOperationStartTrace = (name: string, input: unknown) => {
  Logger.addTrace(
    `${name}: handler start`,
    input === undefined ? undefined : { input: sanitizeTraceValue(input) }
  )
}

const addOperationSuccessTrace = (name: string, result: unknown) => {
  Logger.addTrace(
    `${name}: handler success`,
    result === undefined ? undefined : { result: sanitizeTraceValue(result) }
  )
}

const traceOperation = (name: string, operation: AnyRakunOperation): AnyRakunOperation => {
  const traceableOperation = operation as TraceableOperation

  if (traceableOperation[operationTracingSymbol]) {
    return operation
  }

  const wrapped = {
    ...operation,
    resolve: async (args: { ctx: RakunRequestContext; input: unknown }) => {
      addOperationStartTrace(name, args.input)
      try {
        const result = await operation.resolve(args as never)
        addOperationSuccessTrace(name, result)
        return result
      } catch (error) {
        await recordApiError({
          name,
          operation,
          ctx: args.ctx,
          error,
        })
        throw error
      }
    },
    onSuccess:
      operation.onSuccess || operation.kind === 'mutation'
        ? async (args: { ctx: RakunRequestContext; result: unknown }) => {
            await operation.onSuccess?.(args as never)
            await recordApiOperationSuccess({
              name,
              operation,
              ctx: args.ctx,
            })
          }
        : undefined,
  } as TraceableOperation

  Object.defineProperty(wrapped, operationTracingSymbol, { value: true })

  return wrapped
}

export const traceOperationMap = <TOperations extends RakunOperationMap>(
  operations: TOperations
): TOperations =>
  Object.fromEntries(
    Object.entries(operations).map(([name, operation]) => [name, traceOperation(name, operation)])
  ) as TOperations
