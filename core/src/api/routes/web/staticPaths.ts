import { Route, RouteMap } from '../../../internal-content-types'
import { DEFAULT_STATIC_PAGE_TTL } from '../../../schemas/web/page'
import type { StaticPathsOutput } from '../../../schemas/web/staticPaths'
import type { DBOutput } from '../../../lib/types'
import { getMongoService } from '../../../orm'
import { filterVisibleRouteMapEntries } from '../../utils/routes/routeMapHelpers'

export const buildStaticPathsOutput = (
  routes: readonly DBOutput<Route>[],
  routeMap: readonly DBOutput<RouteMap>[]
): StaticPathsOutput => {
  const staticRouteIds = new Set(
    routes
      .filter((route) => route.hasPage && route.dynamic === false)
      .map((route) => String(route._id))
  )

  return {
    items: routeMap
      .filter((item) => staticRouteIds.has(String(item.routeId)))
      .map((item) => ({
        path: item.path,
        ttl: DEFAULT_STATIC_PAGE_TTL,
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  }
}

export const getStaticPaths = async (): Promise<StaticPathsOutput> => {
  const db = await getMongoService()
  const [routes, routeMap] = await Promise.all([
    db.list(Route, {
      options: {
        limit: 'all',
        fields: ['hasPage', 'dynamic'],
      },
    }),
    db.list(RouteMap, {
      options: {
        limit: 'all',
        fields: ['path', 'routeId', 'contentType', 'contentTypeId'],
      },
    }),
  ])

  const visibleRouteMap = await filterVisibleRouteMapEntries(db, routeMap.items)

  return buildStaticPathsOutput(routes.items, visibleRouteMap)
}
