import { MongoClient, type Db, type Document } from 'mongodb'

import {
  ensureRakunBootstrap,
  ensureRakunInitialized,
  getPermissionList,
  ITERATOR_FIELD_NAME,
} from '@rakun-kit/core'
import { updateSingleRouteMap } from '@rakun-kit/core/api-utils'

import { bootstrap } from './rakun.config'
import { Counter, Hero, Page } from './src/rakun'

const mongoUri = bootstrap.mongo?.MONGO_URI
if (!mongoUri) throw new Error('MONGO_URI is required')

const email = process.env.RAKUN_ADMIN_EMAIL?.trim()
const name = process.env.RAKUN_ADMIN_NAME?.trim()
const password = process.env.RAKUN_ADMIN_PASSWORD
if (!email || !name || !password) {
  throw new Error('RAKUN_ADMIN_EMAIL, RAKUN_ADMIN_NAME and RAKUN_ADMIN_PASSWORD are required')
}

const now = () => new Date()
const translatable = (value: string) => ({ _tag: 'Translatable', en: value })

const seedRouteMap = async ({
  db,
  language,
  page,
  route,
}: {
  db: Db
  language: Document
  page: Document
  route: Document
}) => {
  await db.collection('RouteLocaleVariant').updateOne(
    { routeId: route._id, groupId: page._id, languageId: language._id },
    {
      $set: {
        routeId: route._id,
        routeKey: 'page',
        contentType: Page.name,
        groupId: page._id,
        languageId: language._id,
        documentId: page._id,
        _type: 'RouteLocaleVariant',
        updatedAt: now(),
      },
      $setOnInsert: { createdAt: now() },
    },
    { upsert: true }
  )

  await updateSingleRouteMap({
    contentType: Page.name,
    contentTypeId: page._id.toString(),
  })
}

ensureRakunBootstrap(bootstrap)
await ensureRakunInitialized()

const client = await MongoClient.connect(mongoUri)
const db = client.db()

try {
  const language = await db.collection('Language').findOneAndUpdate(
    { code: 'en' },
    {
      $set: { name: 'English', default: true, updatedAt: now() },
      $setOnInsert: { code: 'en', _type: 'Language', createdAt: now() },
    },
    { upsert: true, returnDocument: 'after' }
  )
  if (!language) throw new Error('Failed to seed English')

  const role = await db.collection('ManagerRole').findOneAndUpdate(
    { name: 'Administrator' },
    {
      $set: { permissions: getPermissionList(), updatedAt: now() },
      $setOnInsert: { name: 'Administrator', _type: 'ManagerRole', createdAt: now() },
    },
    { upsert: true, returnDocument: 'after' }
  )
  if (!role) throw new Error('Failed to seed the administrator role')

  await db.collection('ManagerUser').updateOne(
    { email },
    {
      $set: {
        user: name,
        name,
        password: await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 }),
        role: { type: 'existing', contentType: 'ManagerRole', _id: role._id },
        twoFactorEnabled: false,
        updatedAt: now(),
      },
      $setOnInsert: { email, _type: 'ManagerUser', createdAt: now() },
    },
    { upsert: true }
  )

  const hero = await db.collection(Hero.name).findOneAndUpdate(
    { heading: 'Welcome to Rakun' },
    {
      $set: {
        heading: 'Welcome to Rakun',
        text: 'Edit this content in Rakun Manager, then save to regenerate this page.',
        _type: Hero.name,
        updatedAt: now(),
      },
      $setOnInsert: { createdAt: now() },
    },
    { upsert: true, returnDocument: 'after' }
  )
  if (!hero) throw new Error('Failed to seed the Hero module')

  const page = await db.collection(Page.name).findOneAndUpdate(
    { 'slug.en': 'home' },
    {
      $set: {
        title: translatable('Home'),
        slug: translatable('home'),
        _trashed: false,
        _visibility: 'published',
        [ITERATOR_FIELD_NAME]: [
          {
            name: Hero.name,
            value: { type: 'existing', contentType: Hero.name, _id: hero._id },
          },
          {
            name: Counter.name,
            value: {
              type: 'new',
              data: { initial: 1, _type: Counter.name },
            },
          },
        ],
        _type: Page.name,
        updatedAt: now(),
      },
      $setOnInsert: { createdAt: now() },
    },
    { upsert: true, returnDocument: 'after' }
  )
  if (!page) throw new Error('Failed to seed the Home page')

  const route = await db.collection('Route').findOne({ contentType: Page.name, field: 'slug' })
  if (!route) throw new Error('Failed to find the Page route')

  await db.collection('RouteSettings').updateOne(
    { key: 'default' },
    {
      $set: {
        key: 'default',
        homePage: { type: 'existing', contentType: Page.name, _id: page._id },
        _type: 'RouteSettings',
        updatedAt: now(),
      },
      $setOnInsert: { createdAt: now() },
    },
    { upsert: true }
  )

  await seedRouteMap({ db, language, page, route })
  console.log(`Admin ready: ${email}`)
} finally {
  await client.close()
}
