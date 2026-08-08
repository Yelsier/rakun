import { describe, expect, it } from 'bun:test'

import type { DBOutput } from '../../../lib/types'
import { Route, RouteMap } from '../../../internal-content-types'
import { DEFAULT_STATIC_PAGE_TTL } from '../../../schemas/web/page'
import { buildStaticPathsOutput } from './staticPaths'

describe('web static paths', () => {
  it('returns only page paths whose route is not dynamic', () => {
    const routes = [
      { _id: 'static', hasPage: true, dynamic: false },
      { _id: 'dynamic', hasPage: true, dynamic: true },
      { _id: 'hidden', hasPage: false, dynamic: false },
    ] as DBOutput<Route>[]
    const routeMap = [
      { path: '/projects/rakun/', routeId: 'static' },
      { path: '/', routeId: 'static' },
      { path: '/search/', routeId: 'dynamic' },
      { path: '/hidden/', routeId: 'hidden' },
    ] as DBOutput<RouteMap>[]

    expect(buildStaticPathsOutput(routes, routeMap)).toEqual({
      items: [
        { path: '/', ttl: DEFAULT_STATIC_PAGE_TTL },
        { path: '/projects/rakun/', ttl: DEFAULT_STATIC_PAGE_TTL },
      ],
    })
  })
})
