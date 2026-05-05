import { resolveManagerRoute } from './route-definitions'
import type { ManagerResolvedRoute, ManagerSearchParams } from './types'

export const resolveManagerPath = (args: {
  pathname: string
  basePath?: string
  searchParams?: ManagerSearchParams
}): ManagerResolvedRoute => resolveManagerRoute(args).route
