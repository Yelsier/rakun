'use client'

import type {
  EncodedContentType,
  EncodedFieldUnknown,
  Permission,
} from '@rakun-kit/core/client'
import type { LucideIcon } from 'lucide-react'
import {
  createContext,
  useContext,
  useMemo,
  type ComponentType,
  type ReactNode,
  type RefAttributes,
} from 'react'

import type { FieldValue } from './router/dashboard/[contentType]/[edit]/_fields/shared'

export type ManagerPluginPageProps = {
  params: Record<string, string>
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined>
}

export type ManagerPluginRouteDefinition = {
  id: string
  path: string
  component: ComponentType<ManagerPluginPageProps>
  permissions?: readonly Permission[]
  headerEnd?: ReactNode
}

export type ManagerPluginSidebarItem = {
  id: string
  title: string
  href?: string
  routeId?: string
  icon?: LucideIcon
  group?: string
  position?: 'primary' | 'secondary'
  order?: number
  permissions?: readonly Permission[]
}

export type ManagerFieldEditorRef = {
  getValue: () => unknown
  getState: () => unknown
}

export type ManagerFieldEditorProps = EncodedFieldUnknown & {
  id: string
  defaultData?: FieldValue
  dynamicFallbackPlaceholder?: string
  collapsible?: boolean
  parentContentType?: EncodedContentType
}

export type ManagerFieldEditorComponent = ComponentType<
  ManagerFieldEditorProps & RefAttributes<ManagerFieldEditorRef>
>

export type RakunManagerPluginDefinition = {
  id: string
  routes?: readonly ManagerPluginRouteDefinition[]
  sidebar?: readonly ManagerPluginSidebarItem[]
  fieldEditors?: Readonly<Record<string, ManagerFieldEditorComponent>>
}

export const defineRakunManagerPlugin = <
  TPlugin extends RakunManagerPluginDefinition,
>(
  plugin: TPlugin,
): TPlugin => plugin

export type ResolvedManagerPluginRoute = ManagerPluginRouteDefinition & {
  pluginId: string
}

export type ResolvedManagerPluginSidebarItem = ManagerPluginSidebarItem & {
  pluginId: string
}

export type ManagerPluginRegistry = {
  plugins: readonly RakunManagerPluginDefinition[]
  routes: readonly ResolvedManagerPluginRoute[]
  routesById: ReadonlyMap<string, ResolvedManagerPluginRoute>
  sidebar: readonly ResolvedManagerPluginSidebarItem[]
  fieldEditors: Readonly<Record<string, ManagerFieldEditorComponent>>
}

const normalizePath = (path: string) =>
  `/${path}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/'

export const managerRoutePathsOverlap = (left: string, right: string) => {
  const leftParts = normalizePath(left).split('/').filter(Boolean)
  const rightParts = normalizePath(right).split('/').filter(Boolean)
  if (leftParts.length !== rightParts.length) return false

  return leftParts.every((part, index) => {
    const other = rightParts[index] ?? ''
    return part === other || part.startsWith(':') || other.startsWith(':')
  })
}

const registerId = (
  ids: Map<string, string>,
  id: string,
  owner: string,
  kind: string,
) => {
  if (!id.trim()) throw new Error(`Rakun manager ${kind} ids must not be empty.`)

  const existing = ids.get(id)
  if (existing) {
    throw new Error(
      `Rakun manager plugin conflict for ${kind} "${id}": registered by "${existing}" and "${owner}".`,
    )
  }
  ids.set(id, owner)
}

export const resolveRakunManagerPlugins = (
  plugins: readonly RakunManagerPluginDefinition[] = [],
): ManagerPluginRegistry => {
  const pluginIds = new Map<string, string>()
  const routeIds = new Map<string, string>()
  const routePaths = new Map<string, string>()
  const sidebarIds = new Map<string, string>()
  const editorIds = new Map<string, string>()
  const routes: ResolvedManagerPluginRoute[] = []
  const sidebar: ResolvedManagerPluginSidebarItem[] = []
  const fieldEditors: Record<string, ManagerFieldEditorComponent> = {}

  for (const plugin of plugins) {
    registerId(pluginIds, plugin.id, plugin.id, 'plugin')

    for (const route of plugin.routes ?? []) {
      const routeId = `${plugin.id}:${route.id}`
      const path = normalizePath(route.path)
      registerId(routeIds, routeId, plugin.id, 'route')
      registerId(routePaths, path, plugin.id, 'route path')
      const overlapping = routes.find((existing) =>
        managerRoutePathsOverlap(existing.path, path),
      )
      if (overlapping) {
        throw new Error(
          `Rakun manager plugin route "${path}" from "${plugin.id}" overlaps "${overlapping.path}" from "${overlapping.pluginId}".`,
        )
      }
      routes.push({ ...route, path, pluginId: plugin.id })
    }

    for (const item of plugin.sidebar ?? []) {
      registerId(sidebarIds, `${plugin.id}:${item.id}`, plugin.id, 'sidebar item')
      sidebar.push({ ...item, pluginId: plugin.id })
    }

    for (const [id, editor] of Object.entries(plugin.fieldEditors ?? {})) {
      registerId(editorIds, id, plugin.id, 'field editor')
      fieldEditors[id] = editor
    }
  }

  return {
    plugins,
    routes,
    routesById: new Map(
      routes.map((route) => [`${route.pluginId}:${route.id}`, route]),
    ),
    sidebar,
    fieldEditors,
  }
}

const emptyRegistry = resolveRakunManagerPlugins()
const ManagerPluginContext = createContext<ManagerPluginRegistry>(emptyRegistry)

export const ManagerPluginProvider = ({
  plugins,
  children,
}: {
  plugins?: readonly RakunManagerPluginDefinition[]
  children: ReactNode
}) => {
  const registry = useMemo(() => resolveRakunManagerPlugins(plugins), [plugins])

  return (
    <ManagerPluginContext.Provider value={registry}>
      {children}
    </ManagerPluginContext.Provider>
  )
}

export const useManagerPlugins = () => useContext(ManagerPluginContext)

export { useFieldValues as useManagerFieldValue } from './router/dashboard/[contentType]/[edit]/_fields/shared'
