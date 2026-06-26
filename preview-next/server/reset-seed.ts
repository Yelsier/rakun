import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { ensureRakunBootstrap, ensureRakunInitialized } from '@rakun-kit/next'
import { MongoClient } from 'mongodb'

import { createPreviewBootstrap, getPreviewMongoUri } from './bootstrap'
import { seedPreviewData } from './seed'

if (process.argv.includes('--help')) {
  console.log('Usage: bun run reset-seed')
  console.log('Drops the preview-next Mongo database and recreates seed data.')
  process.exit(0)
}

const previewRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const initialEnvKeys = new Set(Object.keys(process.env))

const loadEnvFile = (path: string) => {
  if (!existsSync(path)) return

  const lines = readFileSync(path, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    const rawValue = trimmed.slice(separator + 1).trim()

    if (!key || initialEnvKeys.has(key)) continue

    process.env[key] = rawValue.replace(/^['"]/, '').replace(/['"]$/, '')
  }
}

loadEnvFile(resolve(previewRoot, '.env'))
loadEnvFile(resolve(previewRoot, '.env.local'))

const mongoUri = getPreviewMongoUri()

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is required. Add it to preview-next/.env.')
}

const client = await MongoClient.connect(mongoUri)

try {
  const db = client.db(mongoUri.split('/').pop()?.split('?')[0])
  console.log(`[preview-next] dropping database ${db.databaseName}`)
  await db.dropDatabase()
} finally {
  await client.close()
}

ensureRakunBootstrap(createPreviewBootstrap())
await ensureRakunInitialized()

await seedPreviewData({
  mongoUri,
  adminEmail: process.env.PREVIEW_ADMIN_EMAIL,
  adminName: process.env.PREVIEW_ADMIN_NAME,
  adminPassword: process.env.PREVIEW_ADMIN_PASSWORD,
  enabled: true,
})

console.log('[preview-next] reset seed completed')

process.exit()
