export type EventLogSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical'

export type EventLogOutcome = 'pending' | 'success' | 'failure' | 'neutral'

export const EVENT_LOG_READ_PERMISSION = 'system.eventLog.read'

export type EventLogJsonValue =
  | string
  | number
  | boolean
  | null
  | EventLogJsonValue[]
  | { [key: string]: EventLogJsonValue }

export type EventLogActor = {
  type: string
  id?: string
  label?: string
}

export type EventLogResource = {
  type: string
  id?: string
  label?: string
}

export type EventLogInput = {
  type: string
  category: string
  occurredAt?: Date
  severity?: EventLogSeverity
  outcome?: EventLogOutcome
  message?: string
  source?: string
  correlationId?: string
  actor?: EventLogActor
  resource?: EventLogResource
  tags?: readonly string[]
  data?: Record<string, EventLogJsonValue>
}

export type EventLogWrite = Omit<EventLogInput, 'occurredAt' | 'severity' | 'outcome' | 'tags'> & {
  occurredAt: Date
  severity: EventLogSeverity
  outcome: EventLogOutcome
  tags: string[]
}

export type EventLogRecord = EventLogWrite & {
  id: string
}

export type EventLogQuery = {
  types?: readonly string[]
  categories?: readonly string[]
  severities?: readonly EventLogSeverity[]
  outcomes?: readonly EventLogOutcome[]
  sources?: readonly string[]
  correlationId?: string
  tags?: readonly string[]
  from?: Date
  to?: Date
  cursor?: string
  limit?: number
}

export type EventLogPage = {
  items: EventLogRecord[]
  nextCursor?: string
}

export interface EventLogAdapter {
  append(event: EventLogWrite): Promise<EventLogRecord>
  query(input: EventLogQuery): Promise<EventLogPage>
}

export type EventLogServiceConfig = {
  adapter: EventLogAdapter
}

export interface EventLogService {
  rawAdapter: EventLogAdapter
  record(input: EventLogInput): Promise<EventLogRecord>
  query(input?: EventLogQuery): Promise<EventLogPage>
}
