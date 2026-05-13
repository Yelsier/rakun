import type { DBService } from './dbService'
import {
  connectDatabase,
  closeDatabase as closeDatabaseConnection,
  type MongoConfig,
} from './database'
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
import { createMongoBackupAdapter } from './backups'
import { createMongoMigrationAdapter } from './migrations'
import { createMongoVersionAdapter } from './versions'

const dbServices = new Map<string, DBService>()
const dbServicePromises = new Map<string, Promise<DBService>>()
let _config: MongoConfig | null = null

export const createMongoConnection = (config: MongoConfig) => {
  _config = config
}

export async function createMongoService(
  config: MongoConfig,
): Promise<DBService> {
  _config = config
  const existing = dbServices.get(config.MONGO_URI)
  if (existing) {
    return existing
  }

  const existingPromise = dbServicePromises.get(config.MONGO_URI)
  if (existingPromise) {
    return await existingPromise
  }

  const promise = (async () => {
    const { db } = await connectDatabase(config)

    const dbService = {
      rawDB: db,
      backups: createMongoBackupAdapter(db),
      migrations: createMongoMigrationAdapter(db),
      versions: createMongoVersionAdapter(db),
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
    dbServices.set(config.MONGO_URI, dbService)

    return dbService
  })()
  dbServicePromises.set(config.MONGO_URI, promise)

  try {
    return await promise
  } finally {
    dbServicePromises.delete(config.MONGO_URI)
  }
}

export async function getMongoService(config?: MongoConfig): Promise<DBService> {
  const resolvedConfig = config ?? _config
  if (!resolvedConfig) {
    throw new Error(
      'MongoDB service not initialized. Call createMongoConnection first.',
    )
  }
  return await createMongoService(resolvedConfig)
}

export async function closeMongoService(): Promise<void> {
  await closeDatabase()
}

export async function closeDatabase(config?: MongoConfig): Promise<void> {
  const uri = config?.MONGO_URI ?? _config?.MONGO_URI
  if (uri) {
    dbServices.delete(uri)
    dbServicePromises.delete(uri)
  }
  await closeDatabaseConnection(config)
}
