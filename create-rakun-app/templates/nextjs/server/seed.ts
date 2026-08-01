import bcrypt from 'bcrypt'
import { config } from 'dotenv'
import { MongoClient } from 'mongodb'

import { ensureRakunBootstrap, ensureRakunInitialized } from '@rakun-kit/core'

import { createRakunBootstrap, getMongoUri } from './bootstrap'

config({ path: '.env.local' })

const email = process.env.RAKUN_ADMIN_EMAIL?.trim()
const name = process.env.RAKUN_ADMIN_NAME?.trim()
const password = process.env.RAKUN_ADMIN_PASSWORD

if (!email || !name || !password) {
  throw new Error('RAKUN_ADMIN_EMAIL, RAKUN_ADMIN_NAME and RAKUN_ADMIN_PASSWORD are required')
}

ensureRakunBootstrap(createRakunBootstrap())
await ensureRakunInitialized()

const client = new MongoClient(getMongoUri())
await client.connect()

try {
  const db = client.db()
  const role = await db.collection('ManagerRole').findOne({ name: 'admin' })
  if (!role) throw new Error('Rakun did not create the admin role')

  const now = new Date()
  await db.collection('ManagerUser').updateOne(
    { email },
    {
      $set: {
        name,
        user: name,
        password: await bcrypt.hash(password, 10),
        role: {
          type: 'existing',
          contentType: 'ManagerRole',
          _id: role._id,
        },
        twoFactorEnabled: false,
        updatedAt: now,
      },
      $setOnInsert: {
        _type: 'ManagerUser',
        createdAt: now,
      },
    },
    { upsert: true }
  )

  process.stdout.write(`Admin ready: ${email}\n`)
} finally {
  await client.close()
}

process.exit()
