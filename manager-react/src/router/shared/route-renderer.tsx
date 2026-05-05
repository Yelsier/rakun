import { getManagerRouteDefinition, renderManagerRoute } from './route-definitions'

import type { ManagerRouteRendererProps } from './types'

export const ManagerRouteRenderer = (props: ManagerRouteRendererProps) => {
  const { route } = props

  if (route.kind === 'unknown') {
    return <>{props.renderUnknown?.(route) ?? <div>Unknown route: {route.pathname}</div>}</>
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
