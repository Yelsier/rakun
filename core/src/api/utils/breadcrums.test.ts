import { describe, expect, it, mock } from 'bun:test'

import { runContentHookContext } from '../hooks/context'
import { Language, Route, RouteMap } from '../../internal-content-types'
import ContentType from '../../lib/ContentType'
import { f } from '../../lib/fields'
import type { DBOutput } from '../../lib/types'
import { registerContentType } from '../../lib/Registry'
import type { DBService } from '../../orm/dbService'
import {
  getRouteBreadcrums,
  hasBreadcrumsFields,
  resolveBreadcrumsFields,
} from './breadcrums'
import { resolveContentOutput } from './dynamicData'

const Parent = new ContentType({
  name: 'BreadcrumsParent',
  fields: {
    slug: f.string().required().translatable(),
  },
})

const Hero = new ContentType({
  name: 'BreadcrumsHero',
  fields: {
    breadcrums: f.breadcrums(),
  },
})

registerContentType(Parent)
registerContentType(Hero)

type RouteRow = DBOutput<typeof Route>
type LanguageRow = DBOutput<typeof Language>

const english = {
  _id: 'language-en',
  _type: 'Language',
  code: 'en',
  name: 'English',
  default: true,
} as LanguageRow

const spanish = {
  _id: 'language-es',
  _type: 'Language',
  code: 'es',
  name: 'Spanish',
  default: false,
} as LanguageRow

const parentRoute = {
  _id: 'route-parent',
  _type: 'Route',
  basePath: { _tag: 'Translatable', en: 'parents', es: 'padres' },
  contentType: Parent.name,
  field: 'slug',
  hasPage: true,
  dynamic: false,
  layoutContentOrder: 0,
} as RouteRow

const childRoute = {
  _id: 'route-child',
  _type: 'Route',
  basePath: { _tag: 'Translatable', en: 'children', es: 'hijos' },
  contentType: 'BreadcrumsChild',
  field: 'slug',
  parent: {
    type: 'self',
    _id: parentRoute._id,
    contentType: 'Route',
  },
  parentRelationField: 'parent',
  hasPage: true,
  dynamic: false,
  layoutContentOrder: 0,
} as RouteRow

describe('breadcrums fields', () => {
  it('builds localized ancestors followed by the current route', async () => {
    const parentDocument = {
      _id: 'parent-es',
      _type: Parent.name,
      slug: { _tag: 'Translatable', en: 'parent', es: 'padre' },
    }
    const parentRouteMap = {
      _id: 'parent-map-es',
      _type: 'RouteMap',
      path: '/es/padres/padre/',
      contentType: Parent.name,
      contentTypeId: parentDocument._id,
      variantGroupId: 'parent-group',
      routeId: parentRoute._id,
      languageId: spanish._id,
    }
    const get = mock(async (contentType: ContentType, id: string) => {
      if (contentType === Route && id === parentRoute._id) return parentRoute
      if (contentType === Parent && id === parentDocument._id) {
        return parentDocument
      }
      throw new Error('not found')
    })
    const find = mock(async (contentType: ContentType, filter: unknown) => {
      if (
        contentType === RouteMap &&
        (filter as { variantGroupId?: string }).variantGroupId === 'parent-group'
      ) {
        return parentRouteMap
      }
      return null
    })
    const db = { get, find } as unknown as DBService

    await expect(
      getRouteBreadcrums({
        db,
        route: childRoute,
        document: {
          _id: 'child-es',
          slug: { _tag: 'Translatable', en: 'child', es: 'hijo' },
          parent: {
            type: 'existing',
            _id: 'parent-group',
            contentType: Parent.name,
          },
        },
        language: spanish,
        languages: [english, spanish],
        path: '/es/padres/padre/hijos/hijo/',
      }),
    ).resolves.toEqual([
      { label: 'padre', href: '/es/padres/padre/' },
      { label: 'hijo', href: '/es/padres/padre/hijos/hijo/' },
    ])
  })

  it('injects the route value and uses null outside routable content', async () => {
    const db = {} as DBService
    const breadcrums = [{ label: 'Page', href: '/page/' }]

    const insideRoute = await runContentHookContext(
      { route: { breadcrums } },
      async () =>
        await resolveContentOutput({
          db,
          contentType: Hero,
          data: { _id: 'hero', _type: Hero.name } as never,
          surface: 'web',
        }),
    )
    const outsideRoute = await resolveContentOutput({
      db,
      contentType: Hero,
      data: { _id: 'hero', _type: Hero.name } as never,
      surface: 'web',
    })

    expect(insideRoute).toMatchObject({ breadcrums })
    expect(outsideRoute).toMatchObject({ breadcrums: null })
    expect(
      Hero.getOutputSchema().safeParse(insideRoute).success,
    ).toBe(true)
  })

  it('keeps the field API-only in manager metadata', () => {
    expect(hasBreadcrumsFields()).toBe(true)
    expect(Hero.fields.breadcrums.getVisibility()).toBe('api')
    expect(
      resolveBreadcrumsFields(Hero, { _type: Hero.name }, null),
    ).toEqual({ _type: Hero.name, breadcrums: null })
  })
})
