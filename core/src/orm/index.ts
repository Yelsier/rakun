import type { DBService } from './dbService'
import { connectDatabase, closeDatabase, type MongoConfig } from './database'
import { clearHandler } from './operations/clear'
import { createHandler } from './operations/create'
import { deleteHandler } from './operations/delete'
import { findHandler } from './operations/find'
import { findDependenciesHandler } from './operations/findDependencies'
import { getHandler } from './operations/get'
import { listhandler } from './operations/list'
import { updateHandler } from './operations/update'
import { updateManyHandler } from './operations/updateMany'
import { upsertHandler } from './operations/upsert'
import { getAllHandler } from './operations/getAll'

let _dbService: DBService | null = null
let _dbServicePromise: Promise<DBService> | null = null
let _config: MongoConfig | null = null

export const createMongoConnection = (config: MongoConfig) => {
  _config = config
}

export async function createMongoService(
  config: MongoConfig,
): Promise<DBService> {
  _config = config
  if (_dbService) {
    return _dbService
  }

  if (_dbServicePromise) {
    return await _dbServicePromise
  }

  _dbServicePromise = (async () => {
    const { db } = await connectDatabase(config)

    _dbService = {
      rawDB: db,
      get: getHandler(db),
      list: listhandler(db),
      create: createHandler(db),
      update: updateHandler(db),
      delete: deleteHandler(db),
      find: findHandler(db),
      clear: clearHandler(db),
      updateMany: updateManyHandler(db),
      findDependencies: findDependenciesHandler(db),
      upsert: upsertHandler(db),
      getAll: getAllHandler(db),
    }

    return _dbService
  })()

  try {
    return await _dbServicePromise
  } finally {
    _dbServicePromise = null
  }
}

export async function getMongoService(): Promise<DBService> {
  if (!_dbService) {
    if (!_config) {
      throw new Error(
        'MongoDB service not initialized. Call createMongoConnection first.',
      )
    }
    return await createMongoService(_config)
  }
  return _dbService
}

export async function closeMongoService(): Promise<void> {
  _dbService = null
  _dbServicePromise = null
  await closeDatabase()
}

export { closeDatabase }
