import type { Db } from 'mongodb'
import { MongoClient } from 'mongodb'

import { checkFailureCase, DbErrorUnknown } from './dbService'
import { createIndexes } from './createIndexes'

type Environment = 'local' | 'development' | 'test' | 'production'

export interface MongoConfig {
  MONGO_URI: string
  ENVIRONMENT?: Environment
}

let _client: MongoClient | null = null
let _db: Db | null = null
let _connectPromise: Promise<{ client: MongoClient; db: Db }> | null = null
let _closePromise: Promise<void> | null = null

export async function connectDatabase(
  config: MongoConfig,
): Promise<{ client: MongoClient; db: Db }> {
  checkFailureCase('ConnectionFailed')

  if (_closePromise) {
    await _closePromise
  }

  if (_client && _db) {
    return { client: _client, db: _db }
  }

  if (_connectPromise) {
    return await _connectPromise
  }

  _connectPromise = (async () => {
    try {
      const client = await MongoClient.connect(config.MONGO_URI)
      const db = client.db(config.MONGO_URI.split('/').pop()?.split('?')[0])

      if (config.ENVIRONMENT !== 'test') {
        await createIndexes(db)
      }

      _client = client
      _db = db

      return { client, db }
    } catch (error) {
      throw new DbErrorUnknown('Failed to connect to database: ' + String(error))
    } finally {
      _connectPromise = null
    }
  })()

  return await _connectPromise
}

export async function closeDatabase(): Promise<void> {
  if (_closePromise) {
    await _closePromise
    return
  }

  if (_connectPromise) {
    try {
      await _connectPromise
    } catch {
      // If connect failed there is nothing left to close.
    }
  }

  if (!_client) {
    _db = null
    return
  }

  const client = _client
  _client = null
  _db = null

  _closePromise = (async () => {
    try {
      await client.close()
    } catch (error) {
      console.error('Error closing database connection:', error)
    } finally {
      _closePromise = null
    }
  })()

  await _closePromise
}

export function getDatabase(): Db {
  if (!_db) {
    throw new DbErrorUnknown(
      'Database not initialized. Call connectDatabase first.',
    )
  }
  return _db
}
