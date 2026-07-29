import type {
  EventLogActor,
  EventLogInput,
  EventLogJsonValue,
  EventLogQuery,
  EventLogResource,
  EventLogService,
  EventLogServiceConfig,
} from './types'

export class EventLogError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'EventLogError'
  }
}

export class EventLogInvalidDataError extends EventLogError {
  constructor(message: string, details?: unknown) {
    super(message, details)
    this.name = 'EventLogInvalidDataError'
  }
}

export class EventLogWriteError extends EventLogError {
  constructor(message: string, details?: unknown) {
    super(message, details)
    this.name = 'EventLogWriteError'
  }
}

export class EventLogQueryError extends EventLogError {
  constructor(message: string, details?: unknown) {
    super(message, details)
    this.name = 'EventLogQueryError'
  }
}

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value?.trim()

  if (!normalized) {
    throw new EventLogInvalidDataError(`${field} must not be empty`)
  }

  return normalized
}

const normalizeOptionalString = (value: string | undefined, field: string) => {
  if (value === undefined) return undefined
  return normalizeRequiredString(value, field)
}

const normalizeReference = <T extends EventLogActor | EventLogResource>(
  value: T | undefined,
  field: string
): T | undefined => {
  if (!value) return undefined

  return {
    type: normalizeRequiredString(value.type, `${field}.type`),
    ...(value.id ? { id: normalizeRequiredString(value.id, `${field}.id`) } : {}),
    ...(value.label ? { label: normalizeRequiredString(value.label, `${field}.label`) } : {}),
  } as T
}

function assertJsonValue(
  value: unknown,
  path: string,
  seen: WeakSet<object>
): asserts value is EventLogJsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new EventLogInvalidDataError(`${path} must contain finite numbers`)
    }
    return
  }

  if (!value || typeof value !== 'object') {
    throw new EventLogInvalidDataError(`${path} must be JSON serializable`)
  }

  if (seen.has(value)) {
    throw new EventLogInvalidDataError(`${path} must not contain circular references`)
  }
  seen.add(value)

  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJsonValue(entry, `${path}[${index}]`, seen))
    seen.delete(value)
    return
  }

  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new EventLogInvalidDataError(`${path} must contain plain JSON objects`)
  }

  for (const [key, entry] of Object.entries(value)) {
    if (!key.trim()) {
      throw new EventLogInvalidDataError(`${path} keys must not be empty`)
    }
    assertJsonValue(entry, `${path}.${key}`, seen)
  }

  seen.delete(value)
}

const normalizeStringList = (
  values: readonly string[] | undefined,
  field: string
): string[] | undefined => {
  if (!values) return undefined

  return Array.from(
    new Set(values.map((value, index) => normalizeRequiredString(value, `${field}[${index}]`)))
  )
}

const normalizeDate = (value: Date | undefined, field: string): Date | undefined => {
  if (value === undefined) return undefined

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new EventLogInvalidDataError(`${field} must be a valid Date`)
  }

  return new Date(value)
}

const normalizeQuery = (input: EventLogQuery): EventLogQuery => {
  const limit = input.limit ?? 50

  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new EventLogInvalidDataError('limit must be an integer between 1 and 200')
  }

  const from = normalizeDate(input.from, 'from')
  const to = normalizeDate(input.to, 'to')

  if (from && to && from > to) {
    throw new EventLogInvalidDataError('from must be before or equal to to')
  }

  return {
    types: normalizeStringList(input.types, 'types'),
    categories: normalizeStringList(input.categories, 'categories'),
    severities: input.severities ? Array.from(new Set(input.severities)) : undefined,
    outcomes: input.outcomes ? Array.from(new Set(input.outcomes)) : undefined,
    sources: normalizeStringList(input.sources, 'sources'),
    correlationId: normalizeOptionalString(input.correlationId, 'correlationId'),
    tags: normalizeStringList(input.tags, 'tags'),
    from,
    to,
    cursor: normalizeOptionalString(input.cursor, 'cursor'),
    limit,
  }
}

export const createEventLogServiceFromAdapter = (
  config: EventLogServiceConfig
): EventLogService => ({
  rawAdapter: config.adapter,

  async record(input) {
    const occurredAt = normalizeDate(input.occurredAt ?? new Date(), 'occurredAt')!
    const data = input.data ? { ...input.data } : undefined

    if (data) {
      assertJsonValue(data, 'data', new WeakSet())
    }

    const event = {
      type: normalizeRequiredString(input.type, 'type'),
      category: normalizeRequiredString(input.category, 'category'),
      occurredAt,
      severity: input.severity ?? 'info',
      outcome: input.outcome ?? 'neutral',
      message: normalizeOptionalString(input.message, 'message'),
      source: normalizeOptionalString(input.source, 'source'),
      correlationId: normalizeOptionalString(input.correlationId, 'correlationId'),
      actor: normalizeReference(input.actor, 'actor'),
      resource: normalizeReference(input.resource, 'resource'),
      tags: normalizeStringList(input.tags, 'tags') ?? [],
      data,
    }

    try {
      return await config.adapter.append(event)
    } catch (error) {
      if (error instanceof EventLogError) throw error
      throw new EventLogWriteError('Failed to persist event log', error)
    }
  },

  async query(input = {}) {
    try {
      return await config.adapter.query(normalizeQuery(input))
    } catch (error) {
      if (error instanceof EventLogError) throw error
      throw new EventLogQueryError('Failed to query event logs', error)
    }
  },
})
