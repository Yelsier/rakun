import { describe, expect, it } from 'bun:test'

import type { Language, Route, RouteSettings } from '../../../internal-content-types'
import type { DBOutput, TranslatableValue } from '../../../lib/types'
import {
  buildRoutePath,
  generateRouteMapItems,
  getRouteFields,
  isHomePageRouteItem,
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
    iterator: 'items',
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

    const routeMaps = await generateRouteMapItems(items, makeRoute(), [spanish], [], null, [
      english,
      spanish,
    ])

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
      makeRoute({ basePath: { _tag: 'Translatable', en: 'articles' } }),
      [english],
      [],
      null
    )

    expect(routeMaps.map((item) => item.contentTypeId)).not.toContain('draft')
    expect(routeMaps.map((item) => item.contentTypeId)).toContain('hidden')
    expect(routeMaps.map((item) => item.contentTypeId)).toContain('published')
    expect(routeMaps.find((item) => item.contentTypeId === 'hidden')?.path).toBe(
      '/en/articles/hidden/'
    )
    expect(routeMaps.find((item) => item.contentTypeId === 'published')?.path).toBe(
      '/en/articles/published-post/'
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
    ).toBe('/en/')
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
    ).toEqual(['slug', 'createdAt', 'updatedAt', 'category'])
  })
})
