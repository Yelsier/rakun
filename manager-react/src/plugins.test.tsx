import { describe, expect, it } from 'bun:test'

import {
  defineRakunManagerPlugin,
  resolveRakunManagerPlugins,
} from './plugins'
import { resolveManagerRoute } from './router/shared/route-definitions'

const PluginScreen = () => null

describe('manager plugins', () => {
  it('resolves plugin routes between static routes and content catchalls', () => {
    const pluginRegistry = resolveRakunManagerPlugins([
      defineRakunManagerPlugin({
        id: 'test.manager',
        routes: [
          {
            id: 'report',
            path: '/reports/:id',
            component: PluginScreen,
          },
        ],
      }),
    ])

    expect(
      resolveManagerRoute({
        pathname: '/backend/reports/weekly',
        basePath: '/backend',
        pluginRegistry,
      }).route,
    ).toEqual({
      kind: 'plugin',
      pluginId: 'test.manager',
      routeId: 'report',
      params: { id: 'weekly' },
    })
  })

  it('rejects overlapping plugin route patterns', () => {
    expect(() =>
      resolveRakunManagerPlugins([
        defineRakunManagerPlugin({
          id: 'first.manager',
          routes: [{ id: 'one', path: '/reports/:id', component: PluginScreen }],
        }),
        defineRakunManagerPlugin({
          id: 'second.manager',
          routes: [{ id: 'two', path: '/reports/latest', component: PluginScreen }],
        }),
      ]),
    ).toThrow('overlaps')
  })

  it('rejects routes reserved by the manager or a content type', () => {
    const builtInRegistry = resolveRakunManagerPlugins([
      defineRakunManagerPlugin({
        id: 'built-in.manager',
        routes: [{ id: 'settings', path: '/settings/system', component: PluginScreen }],
      }),
    ])
    expect(() =>
      resolveManagerRoute({ pathname: '/', pluginRegistry: builtInRegistry }),
    ).toThrow('conflicts with built-in route')

    const contentRegistry = resolveRakunManagerPlugins([
      defineRakunManagerPlugin({
        id: 'content.manager',
        routes: [{ id: 'article', path: '/Article/:id', component: PluginScreen }],
      }),
    ])
    expect(() =>
      resolveManagerRoute({
        pathname: '/',
        pluginRegistry: contentRegistry,
        contentTypes: [{ name: 'Article' }],
      }),
    ).toThrow('conflicts with content type')

    const catchAllRegistry = resolveRakunManagerPlugins([
      defineRakunManagerPlugin({
        id: 'catchall.manager',
        routes: [{ id: 'catchall', path: '/:anything', component: PluginScreen }],
      }),
    ])
    expect(() =>
      resolveManagerRoute({ pathname: '/', pluginRegistry: catchAllRegistry }),
    ).toThrow('must begin with a static path segment')
  })

  it('rejects duplicate editors with both plugin owners', () => {
    expect(() =>
      resolveRakunManagerPlugins([
        defineRakunManagerPlugin({
          id: 'first.editor',
          fieldEditors: { 'field.code': PluginScreen as never },
        }),
        defineRakunManagerPlugin({
          id: 'second.editor',
          fieldEditors: { 'field.code': PluginScreen as never },
        }),
      ]),
    ).toThrow('registered by "first.editor" and "second.editor"')
  })
})
