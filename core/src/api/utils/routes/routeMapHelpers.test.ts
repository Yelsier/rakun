import { describe, expect, it } from 'bun:test'

import type { Language, Route, RouteSettings } from '../../../internal-content-types'
import type { DBOutput, TranslatableValue } from '../../../lib/types'
import {
  buildRoutePath,
  generateRouteMapItems,
  getRouteFields,
  isHomePageRouteItem,
  type RouteLocaleVariantRecord,
} from './routeMapHelpers'

const makeLanguage = (overrides: Partial<DBOutput<Language>>): DBOutput<Language> =>
  ({
    _id: `${overrides.code}-id`,
    _type: 'Language',
    code: overrides.code ?? 'en',
    name: overrides.name ?? String(overrides.code ?? 'en').toUpperCase(),
    default: overrides.default ?? false,
    ...overrides,
  }) as DBOutput<Language>

const makeRoute = (overrides: Partial<DBOutput<Route>> = {}): DBOutput<Route> =>
  ({
    _id: 'route-id',
    _type: 'Route',
    basePath: { _tag: 'Translatable', en: '' },
    contentType: 'Article',
    field: 'slug',
    hasPage: true,
    dynamic: false,
    layoutContentOrder: 0,
    ...overrides,
  }) as DBOutput<Route>

describe('route map helpers', () => {
  it('generates one language while translating with parent/default languages', async () => {
    const english = makeLanguage({ code: 'en', default: true })
    const spanish = makeLanguage({
      code: 'es',
      parent: {
        type: 'self',
        _id: english._id,
        contentType: 'Language',
      },
    })

    const items = [
      {
        _id: 'article-1',
        slug: {
          _tag: 'Translatable',
          en: 'hello-world',
        } satisfies TranslatableValue<string>,
      },
    ]
    const route = makeRoute()

    const routeMaps = await generateRouteMapItems(
      items,
      route,
      [spanish],
      [],
      null,
      [english, spanish],
      [
        {
          routeId: route._id,
          groupId: 'article-1',
          languageId: spanish._id,
          documentId: 'article-1',
        },
      ],
    )

    expect(routeMaps).toHaveLength(1)
    expect(routeMaps[0]?.path).toBe('/es/hello-world/')
  })

  it('falls back to default language when no parent chain matches', () => {
    const english = makeLanguage({ code: 'en', default: true })
    const german = makeLanguage({ code: 'de' })
    const route = makeRoute()

    const path = buildRoutePath(
      {
        _id: 'article-1',
        slug: { _tag: 'Translatable', en: 'fallback' },
      },
      route,
      german,
      '',
      [english, german],
      null
    )

    expect(path).toBe('/de/fallback/')
  })

  it('falls back to first available key when no default exists', () => {
    const german = makeLanguage({ code: 'de' })
    const route = makeRoute()

    const path = buildRoutePath(
      {
        _id: 'article-1',
        slug: { _tag: 'Translatable', fr: 'bonjour' },
      },
      route,
      german,
      '',
      [german],
      null
    )

    expect(path).toBe('/de/bonjour/')
  })

  it('skips items without the configured route field', async () => {
    const english = makeLanguage({ code: 'en', default: true })

    const routeMaps = await generateRouteMapItems(
      [{ _id: 'article-1', title: 'No slug' }],
      makeRoute(),
      [english],
      [],
      null
    )

    expect(routeMaps).toEqual([])
  })

  it('skips draft items while keeping hidden and published items', async () => {
    const english = makeLanguage({ code: 'en', default: true })
    const route = makeRoute({
      basePath: { _tag: 'Translatable', en: 'articles' },
    })

    const routeMaps = await generateRouteMapItems(
      [
        {
          _id: 'draft',
          slug: 'draft-post',
          _visibility: 'draft',
        },
        {
          _id: 'hidden',
          slug: 'hidden-post',
          _visibility: 'hidden',
        },
        {
          _id: 'published',
          slug: 'published-post',
        },
      ],
      route,
      [english],
      [],
      null,
      [english],
      ['draft', 'hidden', 'published'].map((documentId) => ({
        routeId: route._id,
        groupId: documentId,
        languageId: english._id,
        documentId,
      })),
    )

    expect(routeMaps.map((item) => item.contentTypeId)).not.toContain('draft')
    expect(routeMaps.map((item) => item.contentTypeId)).toContain('hidden')
    expect(routeMaps.map((item) => item.contentTypeId)).toContain('published')
    expect(routeMaps.find((item) => item.contentTypeId === 'hidden')?.path).toBe(
      '/articles/hidden/'
    )
    expect(routeMaps.find((item) => item.contentTypeId === 'published')?.path).toBe(
      '/articles/published-post/'
    )
  })

  it('maps configured home page item to the locale root', () => {
    const english = makeLanguage({ code: 'en', default: true })
    const route = makeRoute({ contentType: 'Page' })
    const routeSettings = {
      _id: 'settings-id',
      _type: 'RouteSettings',
      key: 'default',
      homePage: {
        type: 'existing',
        _id: 'home-id',
        contentType: 'Page',
      },
    } as DBOutput<RouteSettings>

    expect(
      isHomePageRouteItem({
        item: { _id: 'home-id' },
        route,
        routeSettings,
      })
    ).toBe(true)
    expect(
      buildRoutePath(
        { _id: 'home-id', slug: { _tag: 'Translatable', en: 'home' } },
        route,
        english,
        '',
        [english],
        routeSettings
      )
    ).toBe('/')
  })

  it('maps locale variant home page groups to locale roots', async () => {
    const english = makeLanguage({ code: 'en', default: true })
    const spanish = makeLanguage({ code: 'es' })
    const route = makeRoute({ contentType: 'Page' })
    const routeSettings = {
      _id: 'settings-id',
      _type: 'RouteSettings',
      key: 'default',
      homePage: {
        type: 'existing',
        _id: 'home-primary',
        contentType: 'Page',
      },
    } as DBOutput<RouteSettings>

    const routeMaps = await generateRouteMapItems(
      [
        {
          _id: 'home-primary',
          slug: { _tag: 'Translatable', en: 'home', es: 'inicio' },
          _localeVariantGroupId: 'home-primary',
          _localeVariantRole: 'primary',
        },
        {
          _id: 'home-es',
          slug: { _tag: 'Translatable', en: 'home-es', es: 'inicio-es' },
          _localeVariantGroupId: 'home-primary',
          _localeVariantRole: 'variant',
        },
      ],
      route,
      [english, spanish],
      [route],
      routeSettings,
      [english, spanish],
      [
        {
          routeId: route._id,
          groupId: 'home-primary',
          languageId: english._id,
          documentId: 'home-primary',
        },
        {
          routeId: route._id,
          groupId: 'home-primary',
          languageId: spanish._id,
          documentId: 'home-es',
        },
      ] satisfies RouteLocaleVariantRecord[]
    )

    expect(routeMaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contentTypeId: 'home-primary',
          languageId: english._id,
          path: '/',
        }),
        expect.objectContaining({
          contentTypeId: 'home-es',
          languageId: spanish._id,
          path: '/es/',
        }),
      ])
    )
  })

  it('maps home page group to roots when settings point at a variant', async () => {
    const english = makeLanguage({ code: 'en', default: true })
    const spanish = makeLanguage({ code: 'es' })
    const route = makeRoute({ contentType: 'Page' })
    const routeSettings = {
      _id: 'settings-id',
      _type: 'RouteSettings',
      key: 'default',
      homePage: {
        type: 'existing',
        _id: 'home-es',
        contentType: 'Page',
      },
    } as DBOutput<RouteSettings>

    const routeMaps = await generateRouteMapItems(
      [
        {
          _id: 'home-primary',
          slug: { _tag: 'Translatable', en: 'home', es: 'inicio' },
          _localeVariantGroupId: 'home-primary',
          _localeVariantRole: 'primary',
        },
        {
          _id: 'home-es',
          slug: { _tag: 'Translatable', en: 'home-es', es: 'inicio-es' },
          _localeVariantGroupId: 'home-primary',
          _localeVariantRole: 'variant',
        },
      ],
      route,
      [english, spanish],
      [route],
      routeSettings,
      [english, spanish],
      [
        {
          routeId: route._id,
          groupId: 'home-primary',
          languageId: english._id,
          documentId: 'home-primary',
        },
        {
          routeId: route._id,
          groupId: 'home-primary',
          languageId: spanish._id,
          documentId: 'home-es',
        },
      ] satisfies RouteLocaleVariantRecord[]
    )

    expect(routeMaps.map((item) => item.path).sort()).toEqual(['/', '/es/'])
  })

  it('includes parent relation field in projected route fields', () => {
    expect(
      getRouteFields(
        makeRoute({
          parent: {
            type: 'self',
            _id: 'parent-route-id',
            contentType: 'Route',
          },
          parentRelationField: 'category',
        })
      )
    ).toEqual([
      'slug',
      '_localeVariantGroupId',
      '_localeVariantRole',
      '_visibility',
      '_trashed',
      'createdAt',
      'updatedAt',
      'category',
    ])
  })

  it('only generates routes for explicitly assigned languages', async () => {
    const english = makeLanguage({ code: 'en', default: true })
    const spanish = makeLanguage({ code: 'es' })
    const mexicanSpanish = makeLanguage({
      code: 'es-MX',
      parent: {
        type: 'self',
        _id: spanish._id,
        contentType: 'Language',
      },
    })
    const route = makeRoute()
    const items = [
      {
        _id: 'about-primary',
        slug: { _tag: 'Translatable', en: 'about', es: 'sobre' },
      },
      {
        _id: 'about-es',
        _localeVariantGroupId: 'about-primary',
        _localeVariantRole: 'variant',
        slug: { _tag: 'Translatable', en: 'about', es: 'sobre-es' },
      },
    ]
    const variants: RouteLocaleVariantRecord[] = [
      {
        routeId: route._id,
        groupId: 'about-primary',
        languageId: spanish._id,
        documentId: 'about-es',
      },
    ]

    const routeMaps = await generateRouteMapItems(
      items,
      route,
      [spanish, mexicanSpanish],
      [],
      null,
      [english, spanish, mexicanSpanish],
      variants
    )

    expect(routeMaps).toHaveLength(1)
    expect(routeMaps[0]?.contentTypeId).toBe('about-es')
    expect(routeMaps[0]?.languageId).toBe(spanish._id)
    expect(routeMaps[0]?.path).toBe('/es/sobre-es/')
  })

  it('prefers exact locale variants over parent assignments', async () => {
    const english = makeLanguage({ code: 'en', default: true })
    const spanish = makeLanguage({ code: 'es' })
    const mexicanSpanish = makeLanguage({
      code: 'es-MX',
      parent: {
        type: 'self',
        _id: spanish._id,
        contentType: 'Language',
      },
    })
    const route = makeRoute()
    const items = [
      {
        _id: 'about-primary',
        slug: { _tag: 'Translatable', en: 'about', es: 'sobre' },
      },
      {
        _id: 'about-es',
        _localeVariantGroupId: 'about-primary',
        _localeVariantRole: 'variant',
        slug: { _tag: 'Translatable', en: 'about', es: 'sobre-es' },
      },
      {
        _id: 'about-mx',
        _localeVariantGroupId: 'about-primary',
        _localeVariantRole: 'variant',
        slug: { _tag: 'Translatable', en: 'about', es: 'sobre-mx', 'es-MX': 'acerca' },
      },
    ]
    const variants: RouteLocaleVariantRecord[] = [
      {
        routeId: route._id,
        groupId: 'about-primary',
        languageId: spanish._id,
        documentId: 'about-es',
      },
      {
        routeId: route._id,
        groupId: 'about-primary',
        languageId: mexicanSpanish._id,
        documentId: 'about-mx',
      },
    ]

    const routeMaps = await generateRouteMapItems(
      items,
      route,
      [mexicanSpanish],
      [],
      null,
      [english, spanish, mexicanSpanish],
      variants
    )

    expect(routeMaps).toHaveLength(1)
    expect(routeMaps[0]?.contentTypeId).toBe('about-mx')
    expect(routeMaps[0]?.path).toBe('/es-MX/acerca/')
  })

  it('lets one locale variant serve multiple languages', async () => {
    const english = makeLanguage({ code: 'en', default: true })
    const spanish = makeLanguage({ code: 'es' })
    const route = makeRoute()
    const items = [
      {
        _id: 'about-primary',
        slug: { _tag: 'Translatable', en: 'about', es: 'sobre' },
      },
      {
        _id: 'about-shared',
        _localeVariantGroupId: 'about-primary',
        _localeVariantRole: 'variant',
        slug: { _tag: 'Translatable', en: 'company', es: 'empresa' },
      },
    ]
    const variants: RouteLocaleVariantRecord[] = [
      {
        routeId: route._id,
        groupId: 'about-primary',
        languageId: english._id,
        documentId: 'about-shared',
      },
      {
        routeId: route._id,
        groupId: 'about-primary',
        languageId: spanish._id,
        documentId: 'about-shared',
      },
    ]

    const routeMaps = await generateRouteMapItems(
      items,
      route,
      [english, spanish],
      [],
      null,
      [english, spanish],
      variants
    )

    expect(routeMaps).toHaveLength(2)
    expect(routeMaps.map((item) => item.contentTypeId)).toEqual([
      'about-shared',
      'about-shared',
    ])
    expect(routeMaps.map((item) => item.path)).toEqual(['/company/', '/es/empresa/'])
  })
})
