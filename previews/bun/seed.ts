import { MongoClient, type Db, type Document } from 'mongodb'

import {
  ensureRakunBootstrap,
  ensureRakunInitialized,
  getPermissionList,
  ITERATOR_FIELD_NAME,
} from '@rakun-kit/core'
import { updateSingleRouteMap } from '@rakun-kit/core/api-utils'

import { bootstrap } from './rakun.config'
import { Counter, LinkSection, Page, PageSection } from './src/rakun'

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
  const routeKey = bootstrap.routes?.find(
    (definition) => definition.contentType === Page.name && definition.hasPage
  )?.key
  if (!routeKey) throw new Error('Failed to find the configured page route key')

  await db.collection('RouteLocaleVariant').updateOne(
    { routeId: route._id, groupId: page._id, languageId: language._id },
    {
      $set: {
        routeId: route._id,
        routeKey,
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
          password: await Bun.password.hash('admin123', {
            algorithm: 'bcrypt',
            cost: 10,
          }),
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
                _id: section._id,
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
            {
              name: LinkSection.name,
              value: {
                type: 'new',
                data: {
                  label: 'Read about Rakun on Bun',
                  link: { href: '/about', title: 'About' },
                  _type: LinkSection.name,
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

    const aboutSection = await db.collection(PageSection.name).findOneAndUpdate(
      { title: 'About Rakun on Bun' },
      {
        $set: {
          title: 'About Rakun on Bun',
          body: 'A second page for testing Bun client navigation and link prefetching.',
          _type: PageSection.name,
          updatedAt: now(),
        },
        $setOnInsert: { createdAt: now() },
      },
      { upsert: true, returnDocument: 'after' }
    )

    if (!aboutSection) throw new Error('Failed to seed the about section')

    const aboutPage = await db.collection(Page.name).findOneAndUpdate(
      { 'slug.en': 'about' },
      {
        $set: {
          title: translatable('About'),
          slug: translatable('about'),
          _trashed: false,
          _visibility: 'published',
          [ITERATOR_FIELD_NAME]: [
            {
              name: PageSection.name,
              value: {
                type: 'existing',
                contentType: PageSection.name,
                _id: aboutSection._id,
              },
            },
            {
              name: LinkSection.name,
              value: {
                type: 'new',
                data: {
                  label: 'Return home',
                  link: { href: '/', title: 'Home' },
                  _type: LinkSection.name,
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

    if (!aboutPage) throw new Error('Failed to seed the about page')

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
            _id: page._id,
          },
          _type: 'RouteSettings',
          updatedAt: now(),
        },
        $setOnInsert: { createdAt: now() },
      },
      { upsert: true }
    )

    await seedRouteMap({ db, language, page, route })
    await seedRouteMap({ db, language, page: aboutPage, route })
    console.log('Seeded preview-bun: admin@example.com / admin123')
  } finally {
    await client.close()
  }
}

await seed()
process.exit(0)
