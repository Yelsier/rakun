import type {
  RakunModuleRegistry,
  RakunModuleRegistryEntry,
} from './registry'

export type RakunWebPluginDefinition = {
  id: string
  modules?: RakunModuleRegistry
}

export const defineRakunWebPlugin = <TPlugin extends RakunWebPluginDefinition>(
  plugin: TPlugin,
): TPlugin => plugin

export const mergeRakunModuleRegistries = ({
  modules = {},
  plugins = [],
}: {
  modules?: RakunModuleRegistry
  plugins?: readonly RakunWebPluginDefinition[]
}): RakunModuleRegistry => {
  const pluginIds = new Set<string>()
  const owners = new Map<string, string>()
  const output: Record<string, RakunModuleRegistryEntry> = {}

  const addModules = (owner: string, entries: RakunModuleRegistry) => {
    for (const [name, entry] of Object.entries(entries)) {
      const existing = owners.get(name)
      if (existing) {
        throw new Error(
          `Rakun web module conflict for "${name}": registered by "${existing}" and "${owner}".`,
        )
      }
      owners.set(name, owner)
      output[name] = entry
    }
  }

  addModules('app', modules)

  for (const plugin of plugins) {
    if (!plugin.id.trim()) throw new Error('Rakun web plugin ids must not be empty.')
    if (pluginIds.has(plugin.id)) {
      throw new Error(`Rakun web plugin id "${plugin.id}" is registered more than once.`)
    }
    pluginIds.add(plugin.id)
    addModules(plugin.id, plugin.modules ?? {})
  }

  return output
}
