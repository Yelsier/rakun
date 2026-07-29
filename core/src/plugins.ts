import type ContentType from './lib/ContentType'
import type { createLogger } from './lib/Logger'
import type { LiteralCatalogInput } from './literals/definitions'
import type { MediaService } from './media'
import type { MailService } from './mail'
import type { EventLogService } from './eventLog'
import type { DBService } from './orm/dbService'
import type { TranslationService } from './translation'
import type { RouteDefinition } from './api/utils/routes/routeDefinitions'
import type { RakunOperationMap } from './api/operations/types'
import type { ResolvedRakunBootstrapOptions } from './bootstrapState'

export type RakunPluginFieldDefinition = {
  id: string
}

export type RakunPluginInitContext = {
  db: DBService
  logger: ReturnType<typeof createLogger>
  media?: MediaService
  mail?: MailService
  eventLog: EventLogService
  translation?: TranslationService
  options: ResolvedRakunBootstrapOptions
}

export type RakunPluginDefinition = {
  id: string
  contentTypes?: readonly ContentType[]
  routes?: readonly RouteDefinition[]
  apiOperations?: RakunOperationMap
  literals?: LiteralCatalogInput
  permissions?: readonly string[]
  fields?: readonly RakunPluginFieldDefinition[]
  initialize?: (context: RakunPluginInitContext) => Promise<void> | void
}

export const defineRakunPlugin = <TPlugin extends RakunPluginDefinition>(
  plugin: TPlugin,
): TPlugin => plugin

export const runRakunPluginInitializers = async ({
  plugins,
  context,
  initializedPluginIds,
}: {
  plugins: readonly RakunPluginDefinition[]
  context: RakunPluginInitContext
  initializedPluginIds: Set<string>
}) => {
  for (const plugin of plugins) {
    if (!plugin.initialize || initializedPluginIds.has(plugin.id)) continue
    await plugin.initialize(context)
    initializedPluginIds.add(plugin.id)
  }
}

export type RakunPluginResolutionInput = {
  contentTypes: readonly ContentType[]
  routes?: readonly RouteDefinition[]
  apiOperations?: RakunOperationMap
  literals: LiteralCatalogInput
  permissions?: readonly string[]
  plugins?: readonly RakunPluginDefinition[]
}

export type RakunResolvedPluginContributions = {
  contentTypes: ContentType[]
  routes: RouteDefinition[]
  apiOperations: RakunOperationMap
  literals: LiteralCatalogInput
  permissions: string[]
  fields: RakunPluginFieldDefinition[]
  plugins: readonly RakunPluginDefinition[]
}

export const assertRakunPluginFieldsDeclared = (
  contentTypes: readonly ContentType[],
  fields: readonly RakunPluginFieldDefinition[],
) => {
  const declaredFields = new Set(fields.map((field) => field.id))

  for (const contentType of contentTypes) {
    const visited = new WeakSet<object>()

    const visitField = (value: unknown) => {
      if (!value || typeof value !== 'object' || visited.has(value)) return
      visited.add(value)

      const record = value as Record<string, unknown>

      if (record.kind === 'field') {
        const meta = record.meta as Record<string, unknown> | undefined
        const editor = meta?.editor

        if (typeof editor === 'string' && !declaredFields.has(editor)) {
          throw new Error(
            `Rakun content type "${contentType.name}" uses undeclared plugin field editor "${editor}".`,
          )
        }
      }

      if (Array.isArray(record.fields)) {
        for (const entry of record.fields) {
          if (entry && typeof entry === 'object' && 'field' in entry) {
            visitField((entry as { field: unknown }).field)
          }
        }
      }

      if ('field' in record) visitField(record.field)
    }

    for (const field of Object.values(contentType.fields)) visitField(field)
  }
}

type OwnedValue<T> = {
  owner: string
  value: T
}

const registerUnique = <T>(
  registry: Map<string, OwnedValue<T>>,
  key: string,
  value: T,
  owner: string,
  kind: string,
) => {
  const existing = registry.get(key)

  if (existing) {
    throw new Error(
      `Rakun plugin conflict for ${kind} "${key}": registered by "${existing.owner}" and "${owner}".`,
    )
  }

  registry.set(key, { owner, value })
}

const routeSignature = (route: RouteDefinition) =>
  `${route.contentType}:${route.field}`

export const resolveRakunPluginContributions = (
  input: RakunPluginResolutionInput,
): RakunResolvedPluginContributions => {
  const plugins = input.plugins ?? []
  const pluginIds = new Map<string, OwnedValue<RakunPluginDefinition>>()
  const contentTypes = new Map<string, OwnedValue<ContentType>>()
  const routeKeys = new Map<string, OwnedValue<RouteDefinition>>()
  const routeSignatures = new Map<string, OwnedValue<RouteDefinition>>()
  const apiOperations = new Map<string, OwnedValue<RakunOperationMap[string]>>()
  const literals = new Map<string, OwnedValue<LiteralCatalogInput[string]>>()
  const fields = new Map<string, OwnedValue<RakunPluginFieldDefinition>>()
  const permissions = new Set<string>(input.permissions ?? [])

  const addContributions = (
    owner: string,
    contributions: Omit<RakunPluginResolutionInput, 'plugins'> & {
      fields?: readonly RakunPluginFieldDefinition[]
    },
  ) => {
    for (const contentType of contributions.contentTypes) {
      registerUnique(
        contentTypes,
        contentType.name,
        contentType,
        owner,
        'content type',
      )
    }

    for (const route of contributions.routes ?? []) {
      registerUnique(routeKeys, route.key, route, owner, 'route key')
      registerUnique(
        routeSignatures,
        routeSignature(route),
        route,
        owner,
        'route signature',
      )
    }

    for (const [name, operation] of Object.entries(
      contributions.apiOperations ?? {},
    )) {
      registerUnique(apiOperations, name, operation, owner, 'API operation')
    }

    for (const [key, literal] of Object.entries(contributions.literals)) {
      registerUnique(literals, key, literal, owner, 'literal')
    }

    for (const field of contributions.fields ?? []) {
      registerUnique(fields, field.id, field, owner, 'field editor')
    }

    for (const permission of contributions.permissions ?? []) {
      permissions.add(permission)
    }
  }

  addContributions('app', input)

  for (const plugin of plugins) {
    if (!plugin.id.trim()) {
      throw new Error('Rakun plugin ids must not be empty.')
    }

    registerUnique(pluginIds, plugin.id, plugin, plugin.id, 'plugin id')
    addContributions(plugin.id, {
      contentTypes: plugin.contentTypes ?? [],
      routes: plugin.routes,
      apiOperations: plugin.apiOperations,
      literals: plugin.literals ?? {},
      permissions: plugin.permissions,
      fields: plugin.fields,
    })
  }

  const resolved = {
    contentTypes: Array.from(contentTypes.values(), ({ value }) => value),
    routes: Array.from(routeKeys.values(), ({ value }) => value),
    apiOperations: Object.fromEntries(
      Array.from(apiOperations, ([name, { value }]) => [name, value]),
    ),
    literals: Object.fromEntries(
      Array.from(literals, ([key, { value }]) => [key, value]),
    ),
    permissions: Array.from(permissions),
    fields: Array.from(fields.values(), ({ value }) => value),
    plugins,
  }

  assertRakunPluginFieldsDeclared(resolved.contentTypes, resolved.fields)

  return resolved
}
