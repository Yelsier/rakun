import { describe, expect, mock, test } from 'bun:test'
import { ObjectId, type Db, type Document } from 'mongodb'

import { createMongoEventLogAdapter, EVENT_LOG_COLLECTION } from './mongo'
import {
  EventLogInvalidDataError,
  EventLogQueryError,
  EventLogWriteError,
  createEventLogServiceFromAdapter,
} from './service'
import type { EventLogAdapter, EventLogQuery, EventLogRecord, EventLogWrite } from './types'

const createAdapter = () => {
  const events: EventLogRecord[] = []
  const queries: EventLogQuery[] = []
  const append = mock(async (event: EventLogWrite) => {
    const record = { id: `event-${events.length + 1}`, ...event }
    events.push(record)
    return record
  })
  const query = mock(async (input: EventLogQuery) => {
    queries.push(input)
    return { items: events }
  })
  const adapter: EventLogAdapter = { append, query }

  return { adapter, append, events, queries }
}

describe('event log service', () => {
  test('normalizes and persists broad structured events', async () => {
    const { adapter, events } = createAdapter()
    const service = createEventLogServiceFromAdapter({ adapter })
    const occurredAt = new Date('2026-01-02T03:04:05.000Z')

    await service.record({
      type: 'content.article.published',
      category: 'content',
      occurredAt,
      severity: 'info',
      outcome: 'success',
      source: 'editorial',
      correlationId: 'request-1',
      actor: { type: 'manager-user', id: 'user-1', label: 'Ada' },
      resource: { type: 'Article', id: 'article-1' },
      tags: [' content ', 'release', 'content'],
      data: {
        locale: 'es',
        changes: 3,
        flags: ['featured', true],
        nested: { version: 2 },
      },
    })

    expect(events[0]).toMatchObject({
      type: 'content.article.published',
      category: 'content',
      occurredAt,
      severity: 'info',
      outcome: 'success',
      tags: ['content', 'release'],
      data: {
        locale: 'es',
        changes: 3,
      },
    })
    expect(events[0]?.occurredAt).not.toBe(occurredAt)
  })

  test('validates JSON data and query pagination', async () => {
    const { adapter, queries } = createAdapter()
    const service = createEventLogServiceFromAdapter({ adapter })

    await expect(
      service.record({
        type: 'invalid',
        category: 'test',
        data: { createdAt: new Date() as never },
      })
    ).rejects.toBeInstanceOf(EventLogInvalidDataError)

    await expect(service.query({ limit: 201 })).rejects.toBeInstanceOf(EventLogInvalidDataError)

    await service.query({
      categories: [' mail ', 'mail'],
      outcomes: ['success'],
      limit: 25,
    })

    expect(queries[0]).toMatchObject({
      categories: ['mail'],
      outcomes: ['success'],
      limit: 25,
    })
  })

  test('wraps adapter write and query failures', async () => {
    const service = createEventLogServiceFromAdapter({
      adapter: {
        append: async () => {
          throw new Error('write unavailable')
        },
        query: async () => {
          throw new Error('query unavailable')
        },
      },
    })

    await expect(service.record({ type: 'test.failed', category: 'test' })).rejects.toBeInstanceOf(
      EventLogWriteError
    )
    await expect(service.query()).rejects.toBeInstanceOf(EventLogQueryError)
  })
})

describe('Mongo event log adapter', () => {
  test('omits undefined values when writing and normalizes historical null values', async () => {
    const insertedDocuments: Document[] = []
    const documents: Document[] = [
      {
        _id: new ObjectId(),
        type: 'mail.send.succeeded',
        category: 'mail',
        occurredAt: new Date('2026-03-04T05:06:07.000Z'),
        severity: 'info',
        outcome: 'success',
        message: null,
        source: null,
        correlationId: null,
        actor: null,
        resource: null,
        tags: ['mail'],
        data: null,
      },
    ]
    const db = {
      collection() {
        return {
          insertOne: async (document: Document) => {
            insertedDocuments.push(document)
            return { insertedId: new ObjectId() }
          },
          find() {
            const cursor = {
              sort: () => cursor,
              limit: () => cursor,
              toArray: async () => documents,
            }
            return cursor
          },
        }
      },
    } as unknown as Db
    const adapter = createMongoEventLogAdapter(db)

    await adapter.append({
      type: 'mail.send.attempted',
      category: 'mail',
      occurredAt: new Date('2026-03-04T05:06:06.000Z'),
      severity: 'info',
      outcome: 'pending',
      message: undefined,
      source: undefined,
      correlationId: undefined,
      actor: undefined,
      resource: undefined,
      tags: ['mail'],
      data: undefined,
    })
    const page = await adapter.query({ limit: 50 })

    expect(insertedDocuments[0]).not.toHaveProperty('message')
    expect(insertedDocuments[0]).not.toHaveProperty('source')
    expect(insertedDocuments[0]).not.toHaveProperty('correlationId')
    expect(insertedDocuments[0]).not.toHaveProperty('actor')
    expect(insertedDocuments[0]).not.toHaveProperty('resource')
    expect(insertedDocuments[0]).not.toHaveProperty('data')
    expect(page.items[0]).not.toHaveProperty('message')
    expect(page.items[0]).not.toHaveProperty('source')
    expect(page.items[0]).not.toHaveProperty('correlationId')
    expect(page.items[0]).not.toHaveProperty('actor')
    expect(page.items[0]).not.toHaveProperty('resource')
    expect(page.items[0]).not.toHaveProperty('data')
  })

  test('maps filters and returns an opaque cursor', async () => {
    const occurredAt = new Date('2026-03-04T05:06:07.000Z')
    const documents: Document[] = [
      {
        _id: new ObjectId(),
        type: 'mail.send.succeeded',
        category: 'mail',
        occurredAt,
        severity: 'info',
        outcome: 'success',
        tags: ['mail'],
      },
      {
        _id: new ObjectId(),
        type: 'mail.send.failed',
        category: 'mail',
        occurredAt: new Date(occurredAt.getTime() - 1),
        severity: 'error',
        outcome: 'failure',
        tags: ['mail'],
      },
    ]
    const filters: Document[] = []
    const collectionNames: string[] = []
    const db = {
      collection(name: string) {
        collectionNames.push(name)
        return {
          find(filter: Document) {
            filters.push(filter)
            const cursor = {
              sort: () => cursor,
              limit: () => cursor,
              toArray: async () => documents,
            }
            return cursor
          },
        }
      },
    } as unknown as Db
    const adapter = createMongoEventLogAdapter(db)
    const firstPage = await adapter.query({
      categories: ['mail'],
      outcomes: ['success', 'failure'],
      tags: ['mail'],
      from: new Date('2026-01-01T00:00:00.000Z'),
      limit: 1,
    })

    expect(collectionNames).toEqual([EVENT_LOG_COLLECTION])
    expect(filters[0]).toMatchObject({
      category: 'mail',
      outcome: { $in: ['success', 'failure'] },
      tags: { $all: ['mail'] },
      occurredAt: { $gte: new Date('2026-01-01T00:00:00.000Z') },
    })
    expect(firstPage.items).toHaveLength(1)
    expect(firstPage.nextCursor).toBeString()

    await adapter.query({
      categories: ['mail'],
      cursor: firstPage.nextCursor,
      limit: 1,
    })

    expect(filters[1]).toHaveProperty('$and')
  })
})
