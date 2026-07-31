import {
  Language,
  Route,
  RouteLocaleVariant,
  RouteMap,
} from '../../../internal-content-types'
import {
  getLocaleVariantGroupId,
  LOCALE_VARIANT_GROUP_FIELD,
} from '../../../lib/localeVariants'
import { getContentTypeByName } from '../../../lib/Registry'
import type { DBOutput } from '../../../lib/types'
import type { DBService } from '../../../orm/dbService'
import type { SlugPathChange } from '../../../schemas/manager/slugRedirects'
import {
  generateRouteMapItems,
  getRouteFields,
  loadRouteData,
  type RouteLocaleVariantRecord,
  type RouteMapItemInput,
  type UnknownItem,
} from '../routes/routeMapHelpers'

const activeContentFilter = {
  _trashed: { $ne: true },
  _visibility: { $nin: ['draft', 'trash'] },
}

const getRouteLocaleVariants = async (
  db: DBService,
  routeId: string,
): Promise<RouteLocaleVariantRecord[]> => {
  return (
    await db.list(RouteLocaleVariant, {
      filter: { routeId },
      options: {
        limit: 'all',
        fields: ['routeId', 'groupId', 'languageId', 'documentId'],
      },
    })
  ).items
}

const getGroupRouteItems = async ({
  db,
  contentType,
  groupIds,
  route,
}: {
  db: DBService
  contentType: string
  groupIds: readonly string[]
  route: DBOutput<Route>
}) => {
  const contentTypeRecord = getContentTypeByName(contentType)!
  const fields = getRouteFields(route)

  return (
    await db.list(contentTypeRecord, {
      filter: {
        ...activeContentFilter,
        $or: [
          { _id: { $in: groupIds } },
          { [LOCALE_VARIANT_GROUP_FIELD]: { $in: groupIds } },
        ],
      },
      options: { limit: 'all', fields },
    })
  ).items as UnknownItem[]
}

const resolveLanguagesByCode = async (
  db: DBService,
  languageCodes: readonly string[],
): Promise<DBOutput<Language>[]> => {
  if (languageCodes.length === 0) return []

  const languages = (
    await db.list(Language, {
      filter: { code: { $in: [...languageCodes] } } as never,
      options: { limit: 'all' },
    })
  ).items

  return languages
}

const diffPathChanges = ({
  prevRoutesMap,
  nextRoutesMap,
  languages,
}: {
  prevRoutesMap: readonly Pick<DBOutput<RouteMap>, 'path' | 'languageId'>[]
  nextRoutesMap: readonly Pick<RouteMapItemInput, 'path' | 'languageId'>[]
  languages: readonly DBOutput<Language>[]
}): SlugPathChange[] => {
  const languageCodeById = new Map(
    languages.map((language) => [language._id, language.code as string]),
  )
  const nextByLanguage = new Map(
    nextRoutesMap.map((item) => [String(item.languageId), String(item.path)]),
  )
  const changes: SlugPathChange[] = []

  for (const prev of prevRoutesMap) {
    const languageId = String(prev.languageId)
    const from = String(prev.path)
    const to = nextByLanguage.get(languageId)
    if (!to || to === from) continue

    changes.push({
      from,
      to,
      languageId,
      languageCode: languageCodeById.get(languageId),
    })
  }

  return changes
}

export const computeSlugPathChanges = async ({
  contentType,
  documentId,
  data,
  assumePublished = false,
  languageCodes,
}: {
  contentType: string
  documentId: string
  data?: Record<string, unknown>
  assumePublished?: boolean
  languageCodes?: readonly string[]
}): Promise<SlugPathChange[]> => {
  const { routes, languages, routeSettings, db } = await loadRouteData()
  const contentTypeRecord = getContentTypeByName(contentType)
  if (!contentTypeRecord) return []

  const current = (await db.get(contentTypeRecord, documentId)) as
    | (UnknownItem & Record<string, unknown>)
    | null
  if (!current) return []

  const merged: UnknownItem & Record<string, unknown> = {
    ...current,
    ...(data ?? {}),
    _id: current._id,
    ...(assumePublished ? { _visibility: 'published', _trashed: false } : {}),
  }

  const route = routes.find((item) => item.contentType === contentType && item.hasPage)
  if (!route) return []

  const initialPrevRoutesMap = (
    await db.list(RouteMap, {
      filter: {
        contentType,
        contentTypeId: documentId,
      },
      options: { limit: 'all' },
    })
  ).items

  const groupIds = Array.from(
    new Set([
      getLocaleVariantGroupId(merged),
      ...initialPrevRoutesMap
        .map((routeMap) => routeMap.variantGroupId)
        .filter((value): value is string => typeof value === 'string'),
    ]),
  )

  const prevRoutesMap = (
    await db.list(RouteMap, {
      filter: {
        contentType,
        routeId: route._id,
        $or: [
          { variantGroupId: { $in: groupIds } },
          { contentTypeId: { $in: groupIds } },
          { contentTypeId: documentId },
        ],
      } as never,
      options: { limit: 'all' },
    })
  ).items

  if (prevRoutesMap.length === 0) return []

  const [groupItems, localeVariants] = await Promise.all([
    getGroupRouteItems({ db, contentType, groupIds, route }),
    getRouteLocaleVariants(db, route._id),
  ])

  const itemsById = new Map(groupItems.map((item) => [item._id, item]))
  itemsById.set(merged._id, merged)

  let projectedLocaleVariants = localeVariants
  if (languageCodes && languageCodes.length > 0) {
    const selected = await resolveLanguagesByCode(db, languageCodes)
    const selectedLanguageIds = new Set(selected.map((language) => language._id))
    const groupId = getLocaleVariantGroupId(merged)
    projectedLocaleVariants = [
      ...localeVariants.filter(
        (variant) =>
          variant.groupId !== groupId ||
          !selectedLanguageIds.has(variant.languageId),
      ),
      ...selected.map((language) => ({
        routeId: route._id,
        groupId,
        languageId: language._id,
        documentId: merged._id,
      })),
    ]
  }

  const nextRoutesMap = await generateRouteMapItems(
    Array.from(itemsById.values()),
    route,
    languages,
    routes,
    routeSettings,
    languages,
    projectedLocaleVariants,
  )

  return diffPathChanges({
    prevRoutesMap,
    nextRoutesMap,
    languages,
  })
}
