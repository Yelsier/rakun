import type { EventLogInput, EventLogQuery, EventLogService, EventLogServiceConfig } from './types'
import { createEventLogServiceFromAdapter } from './service'

let eventLogService: EventLogService | null = null
let config: EventLogServiceConfig | null = null

export const createEventLogConnection = (input: EventLogServiceConfig): void => {
  config = input
}

export const createEventLogService = (input: EventLogServiceConfig): EventLogService => {
  config = input
  eventLogService = createEventLogServiceFromAdapter(input)
  return eventLogService
}

export const getEventLogService = (): EventLogService => {
  if (!eventLogService) {
    if (!config) {
      throw new Error('Event log service not initialized. Call createEventLogConnection first.')
    }

    return createEventLogService(config)
  }

  return eventLogService
}

export const hasEventLogService = (): boolean => Boolean(eventLogService || config)

export const recordEvent = (input: EventLogInput) => getEventLogService().record(input)

export const queryEvents = (input?: EventLogQuery) => getEventLogService().query(input)

export const deleteEventsBefore = (before: Date) => getEventLogService().deleteBefore(before)

export * from './mongo'
export * from './service'
export * from './types'
