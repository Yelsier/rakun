'use client'

import type {
  EncodedContentType,
  EncodedFieldUnknown,
  Permission,
} from '@rakun-kit/core/client'
import type { LucideIcon } from 'lucide-react'
import type { LexicalNodeConfig } from 'lexical'
import {
  createContext,
  useContext,
  useMemo,
  type ComponentType,
  type ReactNode,
  type RefAttributes,
} from 'react'

import type { FieldValue } from './router/dashboard/[contentType]/[edit]/_fields/shared'
import { nodes as builtInRichTextNodes } from './components/blocks/editor-00/nodes'

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

export type ManagerRichTextPluginPlacement =
  | 'toolbar'
  | 'block-format'
  | 'editor'
  | 'actions-start'
  | 'actions-end'

export type ManagerRichTextPluginProps = ManagerFieldEditorProps

export type ManagerRichTextPluginComponent =
  ComponentType<ManagerRichTextPluginProps>

export type ManagerRichTextPluginDefinition = {
  id: string
  component: ManagerRichTextPluginComponent
  placement?: ManagerRichTextPluginPlacement
  order?: number
}

export type ManagerRichTextExtensionDefinition = {
  nodes?: readonly LexicalNodeConfig[]
  plugins?: readonly ManagerRichTextPluginDefinition[]
}

export type RakunManagerPluginDefinition = {
  id: string
  routes?: readonly ManagerPluginRouteDefinition[]
  sidebar?: readonly ManagerPluginSidebarItem[]
  fieldEditors?: Readonly<Record<string, ManagerFieldEditorComponent>>
  richText?: ManagerRichTextExtensionDefinition
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

export type ResolvedManagerRichTextPlugin = ManagerRichTextPluginDefinition & {
  pluginId: string
  placement: ManagerRichTextPluginPlacement
}

export type ManagerPluginRegistry = {
  plugins: readonly RakunManagerPluginDefinition[]
  routes: readonly ResolvedManagerPluginRoute[]
  routesById: ReadonlyMap<string, ResolvedManagerPluginRoute>
  sidebar: readonly ResolvedManagerPluginSidebarItem[]
  fieldEditors: Readonly<Record<string, ManagerFieldEditorComponent>>
  richTextNodes: readonly LexicalNodeConfig[]
  richTextPlugins: readonly ResolvedManagerRichTextPlugin[]
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

const getLexicalNodeRegistration = (node: LexicalNodeConfig) => {
  if (typeof node === 'function') {
    return { kind: 'node', type: node.getType() }
  }

  return { kind: 'node replacement', type: node.replace.getType() }
}

export const resolveRakunManagerPlugins = (
  plugins: readonly RakunManagerPluginDefinition[] = [],
): ManagerPluginRegistry => {
  const pluginIds = new Map<string, string>()
  const routeIds = new Map<string, string>()
  const routePaths = new Map<string, string>()
  const sidebarIds = new Map<string, string>()
  const editorIds = new Map<string, string>()
  const richTextNodeIds = new Map<string, string>(
    builtInRichTextNodes.map((node) => {
      const registration = getLexicalNodeRegistration(node)
      return [
        `${registration.kind}:${registration.type}`,
        '@rakun-kit/manager-react',
      ]
    }),
  )
  const richTextPluginIds = new Map<string, string>()
  const routes: ResolvedManagerPluginRoute[] = []
  const sidebar: ResolvedManagerPluginSidebarItem[] = []
  const fieldEditors: Record<string, ManagerFieldEditorComponent> = {}
  const richTextNodes: LexicalNodeConfig[] = []
  const richTextPlugins: ResolvedManagerRichTextPlugin[] = []

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

    for (const node of plugin.richText?.nodes ?? []) {
      const registration = getLexicalNodeRegistration(node)
      registerId(
        richTextNodeIds,
        `${registration.kind}:${registration.type}`,
        plugin.id,
        `rich text ${registration.kind}`,
      )
      richTextNodes.push(node)
    }

    for (const lexicalPlugin of plugin.richText?.plugins ?? []) {
      registerId(
        richTextPluginIds,
        lexicalPlugin.id,
        plugin.id,
        'rich text plugin',
      )
      richTextPlugins.push({
        ...lexicalPlugin,
        placement: lexicalPlugin.placement ?? 'editor',
        pluginId: plugin.id,
      })
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
    richTextNodes,
    richTextPlugins: richTextPlugins.sort(
      (left, right) => (left.order ?? 0) - (right.order ?? 0),
    ),
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
