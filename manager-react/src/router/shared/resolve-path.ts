import { resolveManagerRoute } from './route-definitions'
import type { ManagerResolvedRoute, ManagerSearchParams } from './types'
import type { ManagerPluginRegistry } from '../../plugins'

export const resolveManagerPath = (args: {
  pathname: string
  basePath?: string
  searchParams?: ManagerSearchParams
  pluginRegistry?: ManagerPluginRegistry
  contentTypes?: { name: string }[]
}): ManagerResolvedRoute => resolveManagerRoute(args).route
