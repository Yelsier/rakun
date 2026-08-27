import bcrypt from 'bcrypt'
import { MongoClient, type Db, type Document } from 'mongodb'

import {
  ensureRakunBootstrap,
  ensureRakunInitialized,
  getPermissionList,
  ITERATOR_FIELD_NAME,
} from '@rakun-kit/core'

import { bootstrap } from './rakun.config'
import { Counter, Page, PageSection } from './src/rakun'

const mongoUri = bootstrap.mongo?.MONGO_URI

if (!mongoUri) {
  throw new Error('preview-bun requires bootstrap.mongo.MONGO_URI')
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
  await db.collection('RouteMap').updateOne(
    { path: '/en/' },
    {
      $set: {
        path: '/en/',
        contentType: Page.name,
        contentTypeId: page._id.toString(),
        routeId: route._id.toString(),
        languageId: language._id.toString(),
        _type: 'RouteMap',
        updatedAt: now(),
      },
      $setOnInsert: { createdAt: now() },
    },
    { upsert: true }
  )
}

const seed = async () => {
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

    if (!language) throw new Error('Failed to seed the English language')

    const role = await db.collection('ManagerRole').findOneAndUpdate(
      { name: 'Bun Preview Admin' },
      {
        $set: { permissions: getPermissionList(), updatedAt: now() },
        $setOnInsert: {
          name: 'Bun Preview Admin',
          _type: 'ManagerRole',
          createdAt: now(),
        },
      },
      { upsert: true, returnDocument: 'after' }
    )

    if (!role) throw new Error('Failed to seed the manager role')

    await db.collection('ManagerUser').updateOne(
      { email: 'admin@example.com' },
      {
        $setOnInsert: {
          user: 'Bun Preview Admin',
          email: 'admin@example.com',
          password: await bcrypt.hash('admin123', 10),
          role: {
            type: 'existing',
            contentType: 'ManagerRole',
            _id: role._id,
          },
          twoFactorEnabled: false,
          _type: 'ManagerUser',
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true }
    )

    const section = await db.collection(PageSection.name).findOneAndUpdate(
      { title: 'Rakun on Bun' },
      {
        $set: {
          title: 'Rakun on Bun',
          body: 'Real Rakun content rendered by the Bun framework.',
          _type: PageSection.name,
          updatedAt: now(),
        },
        $setOnInsert: { createdAt: now() },
      },
      { upsert: true, returnDocument: 'after' }
    )

    if (!section) throw new Error('Failed to seed page modules')

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
              name: PageSection.name,
              value: {
                type: 'existing',
                contentType: PageSection.name,
                _id: section._id.toString(),
              },
            },
            {
              name: Counter.name,
              value: {
                type: 'new',
                data: {
                  initial: 1,
                  _type: Counter.name,
                },
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

    if (!page) throw new Error('Failed to seed the page')

    const route = await db.collection('Route').findOne({
      contentType: Page.name,
      field: 'slug',
    })

    if (!route) throw new Error('Failed to find the configured page route')

    await db.collection('RouteSettings').updateOne(
      { key: 'default' },
      {
        $set: {
          key: 'default',
          homePage: {
            type: 'existing',
            contentType: Page.name,
            _id: page._id.toString(),
          },
          _type: 'RouteSettings',
          updatedAt: now(),
        },
        $setOnInsert: { createdAt: now() },
      },
      { upsert: true }
    )

    await seedRouteMap({ db, language, page, route })
    console.log('Seeded preview-bun: admin@example.com / admin123')
  } finally {
    await client.close()
  }
}

await seed()
process.exit(0)
