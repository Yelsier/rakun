import { getManagerRouteDefinition, renderManagerRoute } from './route-definitions'

import type { ManagerRouteRendererProps } from './types'
import { ManagerDashboardLayout } from '../../layouts'
import { useManagerPlugins } from '../../plugins'
import { useSession } from '../../state/session'
import UnauthorizedMessage from '../../components/unauthorized'

const ManagerPluginRouteRenderer = (props: ManagerRouteRendererProps) => {
  const { route } = props
  const registry = useManagerPlugins()
  const session = useSession()

  if (route.kind !== 'plugin') return null

  const definition = registry.routesById.get(`${route.pluginId}:${route.routeId}`)
  if (!definition) {
    return <div>Plugin route definition not found: {route.pluginId}:{route.routeId}</div>
  }

  const permissions = [...(definition.permissions ?? [])]
  const authorized = permissions.length === 0 || session.hasPermissions(permissions)
  const Component = definition.component
  const children = authorized ? (
    <Component params={route.params} searchParams={props.searchParams} />
  ) : (
    <UnauthorizedMessage neededPermission={permissions} />
  )

  return (
    props.renderDashboardLayout?.({
      children,
      route,
      pathname: props.pathname,
      basePath: props.basePath,
      contentTypes: props.contentTypes,
      headerEnd: definition.headerEnd,
    }) ?? (
      <ManagerDashboardLayout
        route={route}
        contentTypes={props.contentTypes ?? []}
        pathname={props.pathname}
        basePath={props.basePath}
        headerEnd={definition.headerEnd}
      >
        {children}
      </ManagerDashboardLayout>
    )
  )
}

export const ManagerRouteRenderer = (props: ManagerRouteRendererProps) => {
  const { route } = props

  if (route.kind === 'unknown') {
    return <>{props.renderUnknown?.(route) ?? <div>Unknown route: {route.pathname}</div>}</>
  }

  if (route.kind === 'plugin') {
    return <ManagerPluginRouteRenderer {...props} />
  }

  const definition = getManagerRouteDefinition(route.kind)
  if (!definition) {
    return <div>Route definition not found: {route.kind}</div>
  }

  return renderManagerRoute({
    definition,
    route,
    props,
  })
}
