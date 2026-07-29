import z from 'zod'

export const eventLogSeverity = z.enum(['debug', 'info', 'warning', 'error', 'critical'])

export const eventLogOutcome = z.enum(['pending', 'success', 'failure', 'neutral'])

export const eventLogReference = z.object({
  type: z.string(),
  id: z.string().optional(),
  label: z.string().optional(),
})

export const eventLogRecord = z.object({
  id: z.string(),
  type: z.string(),
  category: z.string(),
  occurredAt: z.string(),
  severity: eventLogSeverity,
  outcome: eventLogOutcome,
  message: z.string().optional(),
  source: z.string().optional(),
  correlationId: z.string().optional(),
  actor: eventLogReference.optional(),
  resource: eventLogReference.optional(),
  tags: z.array(z.string()),
  data: z.record(z.string(), z.unknown()).optional(),
})

export const listEventLogsInput = z.object({
  types: z.array(z.string().trim().min(1)).max(20).optional(),
  categories: z.array(z.string().trim().min(1)).max(20).optional(),
  severities: z.array(eventLogSeverity).max(5).optional(),
  outcomes: z.array(eventLogOutcome).max(4).optional(),
  sources: z.array(z.string().trim().min(1)).max(20).optional(),
  correlationId: z.string().trim().min(1).optional(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(200).default(50),
})

export const listEventLogsOutput = z.object({
  items: z.array(eventLogRecord),
  nextCursor: z.string().optional(),
})

export type EventLogRecordOutput = z.infer<typeof eventLogRecord>
export type ListEventLogsInput = z.infer<typeof listEventLogsInput>
export type ListEventLogsOutput = z.infer<typeof listEventLogsOutput>
