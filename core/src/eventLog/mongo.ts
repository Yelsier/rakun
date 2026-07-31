import type { Db, Document, Filter } from 'mongodb'

import { getMongoDB } from '../orm/mongodbPeer'
import { EventLogInvalidDataError } from './service'
import type {
  EventLogAdapter,
  EventLogPage,
  EventLogQuery,
  EventLogRecord,
  EventLogWrite,
} from './types'

export const EVENT_LOG_COLLECTION = 'RakunEventLog'

const optionalString = (value: unknown) =>
  typeof value === 'string' ? value : undefined

const optionalObject = (value: unknown) =>
  value && typeof value === 'object' ? value : undefined

const toRecord = (document: Document): EventLogRecord => ({
  id: String(document._id),
  type: document.type,
  category: document.category,
  occurredAt: document.occurredAt,
  severity: document.severity,
  outcome: document.outcome,
  ...(optionalString(document.message) !== undefined
    ? { message: optionalString(document.message) }
    : {}),
  ...(optionalString(document.source) !== undefined
    ? { source: optionalString(document.source) }
    : {}),
  ...(optionalString(document.correlationId) !== undefined
    ? { correlationId: optionalString(document.correlationId) }
    : {}),
  ...(optionalObject(document.actor) ? { actor: document.actor } : {}),
  ...(optionalObject(document.resource) ? { resource: document.resource } : {}),
  tags: document.tags ?? [],
  ...(optionalObject(document.data) ? { data: document.data } : {}),
})

const omitUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T

const encodeCursor = (record: EventLogRecord): string =>
  `${record.occurredAt.toISOString()}_${record.id}`

const decodeCursor = (cursor: string) => {
  const separator = cursor.lastIndexOf('_')
  const occurredAt = new Date(cursor.slice(0, separator))
  const id = cursor.slice(separator + 1)
  const { ObjectId } = getMongoDB()

  if (separator < 1 || Number.isNaN(occurredAt.getTime()) || !ObjectId.isValid(id)) {
    throw new EventLogInvalidDataError('cursor is invalid')
  }

  return { occurredAt, id: new ObjectId(id) }
}

const addListFilter = (
  filter: Filter<Document>,
  field: string,
  values: readonly string[] | undefined
) => {
  if (!values?.length) return
  filter[field] = values.length === 1 ? values[0] : { $in: values }
}

const buildMongoFilter = (input: EventLogQuery): Filter<Document> => {
  const filter: Filter<Document> = {}

  addListFilter(filter, 'type', input.types)
  addListFilter(filter, 'category', input.categories)
  addListFilter(filter, 'severity', input.severities)
  addListFilter(filter, 'outcome', input.outcomes)
  addListFilter(filter, 'source', input.sources)
  addListFilter(filter, 'data.operation', input.operations)

  if (input.correlationId) filter.correlationId = input.correlationId
  if (input.tags?.length) filter.tags = { $all: input.tags }

  if (input.from || input.to) {
    filter.occurredAt = {
      ...(input.from ? { $gte: input.from } : {}),
      ...(input.to ? { $lte: input.to } : {}),
    }
  }

  if (input.cursor) {
    const cursor = decodeCursor(input.cursor)
    const cursorFilter = {
      $or: [
        { occurredAt: { $lt: cursor.occurredAt } },
        { occurredAt: cursor.occurredAt, _id: { $lt: cursor.id } },
      ],
    }

    return Object.keys(filter).length ? { $and: [filter, cursorFilter] } : cursorFilter
  }

  return filter
}

export const createMongoEventLogAdapter = (db: Db): EventLogAdapter => ({
  async append(event) {
    const document = omitUndefined<EventLogWrite>({
      ...event,
      tags: [...event.tags],
      data: event.data ? { ...event.data } : undefined,
    })
    const result = await db.collection(EVENT_LOG_COLLECTION).insertOne(document)

    return {
      id: String(result.insertedId),
      ...document,
    }
  },

  async query(input): Promise<EventLogPage> {
    const limit = input.limit ?? 50
    const documents = await db
      .collection(EVENT_LOG_COLLECTION)
      .find(buildMongoFilter(input))
      .sort({ occurredAt: -1, _id: -1 })
      .limit(limit + 1)
      .toArray()
    const hasNextPage = documents.length > limit
    const items = documents.slice(0, limit).map(toRecord)

    return {
      items,
      ...(hasNextPage && items.length > 0
        ? { nextCursor: encodeCursor(items[items.length - 1]!) }
        : {}),
    }
  },

  async deleteBefore(before) {
    const result = await db.collection(EVENT_LOG_COLLECTION).deleteMany({
      occurredAt: { $lt: before },
    })

    return result.deletedCount
  },
})
