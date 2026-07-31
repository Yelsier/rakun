import { Db } from 'mongodb'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test'

import {
  Language,
  ManagerNotification,
  ManagerRole,
  ManagerUser,
  Redirect,
  Route,
  RouteLocaleVariant,
  RouteMap,
  RouteSettings,
} from '../../../internal-content-types'
import ContentType from '../../../lib/ContentType'
import { Fields } from '../../../lib/fields'
import { createLogger } from '../../../lib/Logger'
import type { ManagerUserSchema } from '../../../internal-content-types/ManagerUser'
import {
  registerContentType,
  registerInternalContentType,
} from '../../../lib/Registry'
import type { DBOutput } from '../../../lib/types'
import {
  closeDatabase,
  createMongoService,
  getMongoService,
} from '../../../orm'
import type { DBService } from '../../../orm/dbService'
import { createSlugChangeRedirects } from './createSlugChangeRedirects'
import { computeSlugPathChanges } from './slugPathChanges'
import { updateRouteRouteMap, updateSingleRouteMap } from '../routes/updateRoutesMap'

const mongoConfig = {
  MONGO_URI: 'mongodb://localhost:27017/cms_test_slug_redirects',
  ENVIRONMENT: 'test' as const,
}

const assignRouteLanguages = async ({
  db,
  route,
  routeKey,
  contentType,
  documentId,
  languages,
}: {
  db: DBService
  route: DBOutput<typeof Route>
  routeKey: string
  contentType: string
  documentId: string
  languages: readonly DBOutput<typeof Language>[]
}) => {
  await Promise.all(
    languages.map((language) =>
      db.create(RouteLocaleVariant, {
        _type: 'RouteLocaleVariant',
        routeId: route._id,
        routeKey,
        contentType,
        groupId: documentId,
        languageId: language._id,
        documentId,
      }),
    ),
  )
}

const makeUser = (
  permissions: string[],
  overrides: Partial<ManagerUserSchema> & { _id: string },
): ManagerUserSchema =>
  ({
    role: {
      name: 'editor',
      permissions,
    },
    ...overrides,
  }) as ManagerUserSchema

describe.serial('slug change redirects', () => {
  beforeAll(async () => {
    createLogger({
      level: 'error',
      batchSize: 1000,
      maxQueue: 50000,
      prettify: true,
    })

    process.env.ENVIRONMENT = 'test'
    process.env.MONGODB_URI = mongoConfig.MONGO_URI
    process.env.LOG_LEVEL = 'error'
    process.env.BASE_DOMAIN = 'localhost'
    process.env.MANAGER_PREFIX = 'manager'

    await createMongoService(mongoConfig)
    registerInternalContentType(Redirect, { override: true })
    registerInternalContentType(ManagerNotification, { override: true })
    registerInternalContentType(ManagerUser, { override: true })
    registerInternalContentType(ManagerRole, { override: true })
  })

  afterAll(async () => {
    const dbService = await getMongoService(mongoConfig)
    await (dbService.rawDB as Db).dropDatabase()
    await closeDatabase(mongoConfig)
  })

  beforeEach(async () => {
    const db = await getMongoService(mongoConfig)
    await db.clear(RouteSettings)
    await db.clear(RouteMap)
    await db.clear(Route)
    await db.clear(Language)
    await db.clear(RouteLocaleVariant)
    await db.clear(Redirect)
    await db.clear(ManagerNotification)
    await db.clear(ManagerUser)
    await db.clear(ManagerRole)
  })

  it('detects path changes for published slug updates and skips drafts without maps', async () => {
    const TestCT = new ContentType({
      name: 'SlugRedirectPage',
      fields: {
        title: Fields.string().required(),
        slug: Fields.string().translatable().required(),
      },
      documentVisibility: true,
    })
    registerContentType(TestCT)

    //@ts-expect-error reassign type
    Route.fields.contentType = Fields.select([TestCT.name]).required()
    //@ts-expect-error reassign type
    RouteMap.fields.contentType = Fields.select([TestCT.name]).required()

    const db = await getMongoService(mongoConfig)
    const english = await db.create(Language, {
      code: 'en',
      name: 'English',
      default: true,
      _type: 'Language',
    })
    const route = await db.create(Route, {
      basePath: { en: '', _tag: 'Translatable' },
      contentType: TestCT.name,
      field: 'slug',
      hasPage: true,
      dynamic: false,
      _type: 'Route',
      layoutContentOrder: 0,
    })

    const draft = await db.create(TestCT, {
      title: 'Draft',
      slug: { en: 'draft-slug', _tag: 'Translatable' },
      _visibility: 'draft',
      _type: TestCT.name,
    })
    expect(
      await computeSlugPathChanges({
        contentType: TestCT.name,
        documentId: draft._id,
        data: { slug: { en: 'new-draft', _tag: 'Translatable' } },
      }),
    ).toEqual([])

    const published = await db.create(TestCT, {
      title: 'Published',
      slug: { en: 'old-slug', _tag: 'Translatable' },
      _visibility: 'published',
      _type: TestCT.name,
    })
    await assignRouteLanguages({
      db,
      route,
      routeKey: 'slug-redirect',
      contentType: TestCT.name,
      documentId: published._id,
      languages: [english],
    })
    await updateRouteRouteMap(route as unknown as DBOutput<typeof Route>)
    await updateSingleRouteMap({
      contentType: TestCT.name,
      contentTypeId: published._id,
    })

    const changes = await computeSlugPathChanges({
      contentType: TestCT.name,
      documentId: published._id,
      data: { slug: { en: 'new-slug', _tag: 'Translatable' } },
    })

    expect(changes).toEqual([
      expect.objectContaining({
        from: '/old-slug/',
        to: '/new-slug/',
        languageCode: 'en',
      }),
    ])
  })

  it('creates enabled redirects with create permission and disabled + notifies otherwise', async () => {
    const db = await getMongoService(mongoConfig)
    const adminRole = await db.create(ManagerRole, {
      name: 'admin',
      permissions: ['content.Redirect.updateAny', 'content.Redirect.own'],
      _type: 'ManagerRole',
    })
    const editorRole = await db.create(ManagerRole, {
      name: 'editor',
      permissions: [],
      _type: 'ManagerRole',
    })
    const admin = await db.create(ManagerUser, {
      name: 'Admin',
      user: 'admin@example.com',
      email: 'admin@example.com',
      password: 'Password123!',
      twoFactorEnabled: false,
      role: { _id: adminRole._id, type: 'existing', contentType: 'ManagerRole' },
      _type: 'ManagerUser',
    })
    const editor = await db.create(ManagerUser, {
      name: 'Editor',
      user: 'editor@example.com',
      email: 'editor@example.com',
      password: 'Password123!',
      twoFactorEnabled: false,
      role: { _id: editorRole._id, type: 'existing', contentType: 'ManagerRole' },
      _type: 'ManagerUser',
    })

    const changes = [
      {
        from: '/old/',
        to: '/new/',
        languageId: 'lang',
        languageCode: 'en',
      },
    ]

    const enabled = await createSlugChangeRedirects({
      changes,
      user: makeUser(['content.Redirect.own'], { _id: editor._id }),
      sourceContentType: 'Page',
      sourceDocumentId: 'doc-1',
    })
    expect(enabled).toEqual([
      expect.objectContaining({ enabled: true, from: '/old/', to: '/new/' }),
    ])
    expect(
      (
        await db.list(ManagerNotification, {
          options: { limit: 'all' },
        })
      ).items,
    ).toHaveLength(0)

    await db.clear(Redirect)
    await db.clear(ManagerNotification)

    const disabled = await createSlugChangeRedirects({
      changes: [
        {
          from: '/a/',
          to: '/b/',
          languageId: 'lang',
          languageCode: 'en',
        },
      ],
      user: makeUser([], { _id: editor._id }),
      sourceContentType: 'Page',
      sourceDocumentId: 'doc-2',
    })
    expect(disabled).toEqual([
      expect.objectContaining({ enabled: false, from: '/a/', to: '/b/' }),
    ])

    const notifications = (
      await db.list(ManagerNotification, {
        options: { limit: 'all' },
      })
    ).items
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({
      kind: 'redirect_enable_requested',
      contentType: 'Redirect',
      documentId: disabled[0]._id,
    })
    expect(
      (notifications[0].user as { _id?: string } | undefined)?._id ??
        notifications[0].user,
    ).toBe(admin._id)
  })

  it('computes promote path changes with simulated language assignment', async () => {
    const TestCT = new ContentType({
      name: 'SlugPromotePage',
      fields: {
        title: Fields.string().required(),
        slug: Fields.string().translatable().required(),
      },
      documentVisibility: true,
    })
    registerContentType(TestCT)

    //@ts-expect-error reassign type
    Route.fields.contentType = Fields.select([TestCT.name]).required()
    //@ts-expect-error reassign type
    RouteMap.fields.contentType = Fields.select([TestCT.name]).required()

    const db = await getMongoService(mongoConfig)
    const english = await db.create(Language, {
      code: 'en',
      name: 'English',
      default: true,
      _type: 'Language',
    })
    const route = await db.create(Route, {
      basePath: { en: '', _tag: 'Translatable' },
      contentType: TestCT.name,
      field: 'slug',
      hasPage: true,
      dynamic: false,
      _type: 'Route',
      layoutContentOrder: 0,
    })

    const published = await db.create(TestCT, {
      title: 'Live',
      slug: { en: 'live', _tag: 'Translatable' },
      _visibility: 'published',
      _type: TestCT.name,
    })
    const draft = await db.create(TestCT, {
      title: 'Draft',
      slug: { en: 'next', _tag: 'Translatable' },
      _visibility: 'draft',
      _localeVariantGroupId: published._id,
      _localeVariantRole: 'variant',
      _type: TestCT.name,
    })
    await assignRouteLanguages({
      db,
      route,
      routeKey: 'slug-promote',
      contentType: TestCT.name,
      documentId: published._id,
      languages: [english],
    })
    await updateRouteRouteMap(route as unknown as DBOutput<typeof Route>)
    await updateSingleRouteMap({
      contentType: TestCT.name,
      contentTypeId: published._id,
    })

    const changes = await computeSlugPathChanges({
      contentType: TestCT.name,
      documentId: draft._id,
      assumePublished: true,
      languageCodes: ['en'],
    })

    expect(changes).toEqual([
      expect.objectContaining({
        from: '/live/',
        to: '/next/',
        languageCode: 'en',
      }),
    ])
  })

  it('compounds redirects when a path moves again (A→B then B→C => A→C, B→C)', async () => {
    const db = await getMongoService(mongoConfig)
    const user = makeUser(['content.Redirect.own'], { _id: 'user-compound' })

    await createSlugChangeRedirects({
      changes: [
        {
          from: '/route1/',
          to: '/route2/',
          languageId: 'lang',
          languageCode: 'en',
        },
      ],
      user,
      sourceContentType: 'Page',
      sourceDocumentId: 'doc-compound',
    })

    await createSlugChangeRedirects({
      changes: [
        {
          from: '/route2/',
          to: '/route3/',
          languageId: 'lang',
          languageCode: 'en',
        },
      ],
      user,
      sourceContentType: 'Page',
      sourceDocumentId: 'doc-compound',
    })

    const redirects = (
      await db.list(Redirect, { options: { limit: 'all' } })
    ).items
      .map((item) => ({
        sourcePath: item.sourcePath,
        destinationPath: item.destinationPath,
      }))
      .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))

    expect(redirects).toEqual([
      { sourcePath: '/route1/', destinationPath: '/route3/' },
      { sourcePath: '/route2/', destinationPath: '/route3/' },
    ])
  })

  it('on revert, deletes the previous redirect and creates the reverse (h1→h2 then h2→h1 => h2→h1)', async () => {
    const db = await getMongoService(mongoConfig)
    const user = makeUser(['content.Redirect.own'], { _id: 'user-revert' })

    await createSlugChangeRedirects({
      changes: [
        {
          from: '/route1/',
          to: '/route2/',
          languageId: 'lang',
          languageCode: 'en',
        },
      ],
      user,
      sourceContentType: 'Page',
      sourceDocumentId: 'doc-revert',
    })

    const reverted = await createSlugChangeRedirects({
      changes: [
        {
          from: '/route2/',
          to: '/route1/',
          languageId: 'lang',
          languageCode: 'en',
        },
      ],
      user,
      sourceContentType: 'Page',
      sourceDocumentId: 'doc-revert',
    })

    expect(reverted).toEqual([
      expect.objectContaining({
        enabled: true,
        from: '/route2/',
        to: '/route1/',
      }),
    ])
    const redirects = (
      await db.list(Redirect, { options: { limit: 'all' } })
    ).items.map((item) => ({
      sourcePath: item.sourcePath,
      destinationPath: item.destinationPath,
    }))
    expect(redirects).toEqual([
      { sourcePath: '/route2/', destinationPath: '/route1/' },
    ])
  })

  it('on revert after a chain, deletes the reclaimed redirect, creates reverse, and retargets others', async () => {
    const db = await getMongoService(mongoConfig)
    const user = makeUser(['content.Redirect.own'], { _id: 'user-chain-revert' })

    await createSlugChangeRedirects({
      changes: [
        {
          from: '/route1/',
          to: '/route2/',
          languageId: 'lang',
          languageCode: 'en',
        },
      ],
      user,
      sourceContentType: 'Page',
      sourceDocumentId: 'doc-chain-revert',
    })
    await createSlugChangeRedirects({
      changes: [
        {
          from: '/route2/',
          to: '/route3/',
          languageId: 'lang',
          languageCode: 'en',
        },
      ],
      user,
      sourceContentType: 'Page',
      sourceDocumentId: 'doc-chain-revert',
    })

    const reverted = await createSlugChangeRedirects({
      changes: [
        {
          from: '/route3/',
          to: '/route1/',
          languageId: 'lang',
          languageCode: 'en',
        },
      ],
      user,
      sourceContentType: 'Page',
      sourceDocumentId: 'doc-chain-revert',
    })

    expect(reverted).toEqual([
      expect.objectContaining({
        from: '/route3/',
        to: '/route1/',
      }),
    ])
    const redirects = (
      await db.list(Redirect, { options: { limit: 'all' } })
    ).items
      .map((item) => ({
        sourcePath: item.sourcePath,
        destinationPath: item.destinationPath,
      }))
      .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))

    expect(redirects).toEqual([
      { sourcePath: '/route2/', destinationPath: '/route1/' },
      { sourcePath: '/route3/', destinationPath: '/route1/' },
    ])
  })
})
