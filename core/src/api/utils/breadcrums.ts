import { Language, Route, RouteMap } from '../../internal-content-types'
import type ContentType from '../../lib/ContentType'
import type { Breadcrumb, BreadcrumsValue } from '../../lib/fields/Breadcrums'
import type { DBOutput, MaybeTranslatableValue } from '../../lib/types'
import { getContentTypeByName, getContentTypes } from '../../lib/Registry'
import { getTranslation } from '../../lib/utils/getTranslation'
import type { DBService } from '../../orm/dbService'

type RouteDocument = Record<string, unknown> & {
  _id: string
}

const getRelationId = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object' || !('_id' in value)) {
    return undefined
  }

  return typeof value._id === 'string' ? value._id : undefined
}

const getRouteMapForDocument = async ({
  db,
  routeId,
  documentId,
  languageId,
}: {
  db: DBService
  routeId: string
  documentId: string
  languageId: string
}) =>
  (await db.find(RouteMap, {
    routeId,
    variantGroupId: documentId,
    languageId,
  })) ??
  (await db.find(RouteMap, {
    routeId,
    contentTypeId: documentId,
    languageId,
  }))

const getBreadcrumbLabel = (
  document: RouteDocument,
  route: DBOutput<typeof Route>,
  language: DBOutput<typeof Language>,
  languages: readonly DBOutput<typeof Language>[],
): string => {
  const value = document[route.field]
  if (typeof value === 'string') return value

  return getTranslation(
    value as MaybeTranslatableValue<string>,
    language,
    [...languages],
  )
}

export const getRouteBreadcrums = async ({
  db,
  route,
  document,
  language,
  languages,
  path,
}: {
  db: DBService
  route: DBOutput<typeof Route>
  document: RouteDocument
  language: DBOutput<typeof Language>
  languages: readonly DBOutput<typeof Language>[]
  path: string
}): Promise<Breadcrumb[]> => {
  const breadcrumbs: Breadcrumb[] = []
  const visitedRouteIds = new Set<string>()

  const visit = async (
    currentRoute: DBOutput<typeof Route>,
    currentDocument: RouteDocument,
    href: string,
  ): Promise<void> => {
    if (visitedRouteIds.has(currentRoute._id)) return
    visitedRouteIds.add(currentRoute._id)

    const parentRouteId = getRelationId(currentRoute.parent)
    const parentRelationField = currentRoute.parentRelationField

    if (parentRouteId && parentRelationField) {
      const parentDocumentId = getRelationId(
        currentDocument[parentRelationField],
      )
      const parentRoute = await db.get(Route, parentRouteId).catch(() => null)

      if (parentDocumentId && parentRoute) {
        const parentRouteMap = await getRouteMapForDocument({
          db,
          routeId: parentRoute._id,
          documentId: parentDocumentId,
          languageId: language._id,
        })
        const parentContentType = parentRouteMap
          ? getContentTypeByName(parentRouteMap.contentType)
          : undefined
        const parentDocument =
          parentRouteMap && parentContentType
            ? await db
                .get(parentContentType, parentRouteMap.contentTypeId)
                .catch(() => null)
            : null

        if (parentRouteMap && parentDocument) {
          await visit(
            parentRoute,
            parentDocument as RouteDocument,
            parentRouteMap.path,
          )
        }
      }
    }

    breadcrumbs.push({
      label: getBreadcrumbLabel(
        currentDocument,
        currentRoute,
        language,
        languages,
      ),
      href,
    })
  }

  await visit(route, document, path)
  return breadcrumbs
}

export const hasBreadcrumsFields = (): boolean =>
  getContentTypes().some((contentType) =>
    Object.values(contentType.fields).some(
      (field) => field.meta.type === 'Breadcrums',
    ),
  )

export const resolveBreadcrumsFields = <T>(
  contentType: ContentType,
  data: T,
  breadcrums: BreadcrumsValue,
): T => {
  if (!data || typeof data !== 'object') return data

  const fieldNames = Object.entries(contentType.fields).flatMap(
    ([name, field]) => (field.meta.type === 'Breadcrums' ? [name] : []),
  )
  if (fieldNames.length === 0) return data

  return {
    ...data,
    ...Object.fromEntries(fieldNames.map((name) => [name, breadcrums])),
  }
}
