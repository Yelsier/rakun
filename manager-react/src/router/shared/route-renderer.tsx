import { getManagerRouteDefinition, renderManagerRoute } from './route-definitions'

import type { ManagerRouteRendererProps } from './types'
import { ManagerDashboardLayout } from '../../layouts'
import { useManagerPlugins } from '../../plugins'
import { useSession } from '../../state/session'
import UnauthorizedMessage from '../../components/unauthorized'
import { useTranslations } from '@/i18n'

const ManagerPluginRouteRenderer = (props: ManagerRouteRendererProps) => {
  const { route } = props
  const t = useTranslations()
  const registry = useManagerPlugins()
  const session = useSession()

  if (route.kind !== 'plugin') return null

  const definition = registry.routesById.get(`${route.pluginId}:${route.routeId}`)
  if (!definition) {
    return (
      <div>
        {t('routes.pluginNotFound')} {route.pluginId}:{route.routeId}
      </div>
    )
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
      siteUrl: props.siteUrl,
      contentTypes: props.contentTypes,
      headerEnd: definition.headerEnd,
    }) ?? (
      <ManagerDashboardLayout
        route={route}
        contentTypes={props.contentTypes ?? []}
        pathname={props.pathname}
        basePath={props.basePath}
        siteUrl={props.siteUrl}
        headerEnd={definition.headerEnd}
      >
        {children}
      </ManagerDashboardLayout>
    )
  )
}

export const ManagerRouteRenderer = (props: ManagerRouteRendererProps) => {
  const { route } = props
  const t = useTranslations()

  if (route.kind === 'unknown') {
    return (
      <>
        {props.renderUnknown?.(route) ?? (
          <div>
            {t('routes.unknown')} {route.pathname}
          </div>
        )}
      </>
    )
  }

  if (route.kind === 'plugin') {
    return <ManagerPluginRouteRenderer {...props} />
  }

  const definition = getManagerRouteDefinition(route.kind)
  if (!definition) {
    return (
      <div>
        {t('routes.definitionNotFound')} {route.kind}
      </div>
    )
  }

  return renderManagerRoute({
    definition,
    route,
    props,
  })
}
