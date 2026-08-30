import type { Db, MongoClient, MongoClientOptions } from 'mongodb'

import { checkFailureCase, DbErrorUnknown } from './dbService'
import { createIndexes } from './createIndexes'
import { getMongoDB } from './mongodbPeer'

type Environment = 'local' | 'development' | 'test' | 'production'

export interface MongoConfig {
  MONGO_URI: string
  ENVIRONMENT?: Environment
  /** MongoDB driver options. Idle pooled sockets close after 60 seconds by default. */
  clientOptions?: MongoClientOptions
}

type DatabaseConnection = {
  client: MongoClient | null
  db: Db | null
  connectPromise: Promise<{ client: MongoClient; db: Db }> | null
  closePromise: Promise<void> | null
}

const connections = new Map<string, DatabaseConnection>()
let currentUri: string | null = null

const getConnection = (uri: string): DatabaseConnection => {
  const existing = connections.get(uri)
  if (existing) return existing

  const connection: DatabaseConnection = {
    client: null,
    db: null,
    connectPromise: null,
    closePromise: null,
  }
  connections.set(uri, connection)
  return connection
}

export async function connectDatabase(
  config: MongoConfig
): Promise<{ client: MongoClient; db: Db }> {
  checkFailureCase('ConnectionFailed')
  currentUri = config.MONGO_URI
  const connection = getConnection(config.MONGO_URI)

  if (connection.closePromise) {
    await connection.closePromise
  }

  if (connection.client && connection.db) {
    return { client: connection.client, db: connection.db }
  }

  if (connection.connectPromise) {
    return await connection.connectPromise
  }

  connection.connectPromise = (async () => {
    let pendingClient: MongoClient | undefined
    try {
      const { MongoClient } = getMongoDB()
      pendingClient = await MongoClient.connect(config.MONGO_URI, {
        maxIdleTimeMS: 60_000,
        ...config.clientOptions,
      })
      const client = pendingClient
      const db = client.db(config.MONGO_URI.split('/').pop()?.split('?')[0])

      if (config.ENVIRONMENT !== 'test') {
        await createIndexes(db)
      }

      connection.client = client
      connection.db = db

      return { client, db }
    } catch (error) {
      await pendingClient?.close().catch(() => undefined)
      if (!connection.client) {
        connections.delete(config.MONGO_URI)
        if (currentUri === config.MONGO_URI) currentUri = null
      }
      throw new DbErrorUnknown('Failed to connect to database: ' + String(error))
    } finally {
      connection.connectPromise = null
    }
  })()

  return await connection.connectPromise
}

export async function closeDatabase(config?: MongoConfig): Promise<void> {
  if (!config) {
    await Promise.all(Array.from(connections.keys(), async (uri) => await closeConnection(uri)))
    currentUri = null
    return
  }

  await closeConnection(config.MONGO_URI)
}

const closeConnection = async (uri: string): Promise<void> => {
  const connection = connections.get(uri)
  if (!connection) return

  if (connection.closePromise) {
    await connection.closePromise
    return
  }

  if (connection.connectPromise) {
    try {
      await connection.connectPromise
    } catch {
      // If connect failed there is nothing left to close.
    }
  }

  if (!connection.client) {
    connection.db = null
    connections.delete(uri)
    if (currentUri === uri) currentUri = null
    return
  }

  const client = connection.client
  connection.client = null
  connection.db = null

  connection.closePromise = (async () => {
    try {
      await client.close()
    } catch (error) {
      console.error('Error closing database connection:', error)
    } finally {
      connection.closePromise = null
      connections.delete(uri)
      if (currentUri === uri) {
        currentUri = null
      }
    }
  })()

  await connection.closePromise
}

export function getDatabase(): Db {
  const db = currentUri ? connections.get(currentUri)?.db : null
  if (!db) {
    throw new DbErrorUnknown(
      'Database not initialized. Call connectDatabase first.',
    )
  }
  return db
}
