import { describe, expect, it } from 'bun:test'

import { defineRakunWebPlugin, mergeRakunModuleRegistries } from './plugins'

describe('web plugins', () => {
  it('merges app and plugin module registries', () => {
    const appModule = async () => ({ default: () => null })
    const pluginModule = async () => ({ default: () => null })

    const registry = mergeRakunModuleRegistries({
      modules: { AppHero: appModule },
      plugins: [
        defineRakunWebPlugin({
          id: 'test.web',
          modules: { PluginHero: pluginModule },
        }),
      ],
    })

    expect(registry).toEqual({ AppHero: appModule, PluginHero: pluginModule })
  })

  it('rejects duplicate module names and plugin ids', () => {
    expect(() =>
      mergeRakunModuleRegistries({
        modules: { Hero: async () => ({ default: () => null }) },
        plugins: [
          defineRakunWebPlugin({
            id: 'test.web',
            modules: { Hero: async () => ({ default: () => null }) },
          }),
        ],
      }),
    ).toThrow('registered by "app" and "test.web"')

    const plugin = defineRakunWebPlugin({ id: 'duplicate.web' })
    expect(() => mergeRakunModuleRegistries({ plugins: [plugin, plugin] })).toThrow(
      'registered more than once',
    )
  })
})
