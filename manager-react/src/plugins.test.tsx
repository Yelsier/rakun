import { describe, expect, it } from 'bun:test'
import type { LexicalNodeConfig } from 'lexical'

import {
  defineRakunManagerPlugin,
  resolveRakunManagerPlugins,
} from './plugins'
import { resolveManagerRoute } from './router/shared/route-definitions'

const PluginScreen = () => null

const createLexicalNode = (type: string) =>
  Object.assign(function PluginLexicalNode() {}, {
    getType: () => type,
  }) as unknown as LexicalNodeConfig

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

  it('merges rich text nodes and orders Lexical plugins by placement order', () => {
    const MentionPlugin = () => null
    const EmojiPlugin = () => null
    const MentionNode = createLexicalNode('plugin-mention')
    const registry = resolveRakunManagerPlugins([
      defineRakunManagerPlugin({
        id: 'test.rich-text',
        richText: {
          nodes: [MentionNode],
          plugins: [
            {
              id: 'test.rich-text.emoji',
              component: EmojiPlugin,
              placement: 'toolbar',
              order: 20,
            },
            {
              id: 'test.rich-text.mention',
              component: MentionPlugin,
              order: 10,
            },
          ],
        },
      }),
    ])

    expect(registry.richTextNodes).toEqual([MentionNode])
    expect(
      registry.richTextPlugins.map(({ id, placement }) => ({ id, placement })),
    ).toEqual([
      { id: 'test.rich-text.mention', placement: 'editor' },
      { id: 'test.rich-text.emoji', placement: 'toolbar' },
    ])
  })

  it('rejects duplicate Lexical nodes with both plugin owners', () => {
    expect(() =>
      resolveRakunManagerPlugins([
        defineRakunManagerPlugin({
          id: 'first.rich-text',
          richText: { nodes: [createLexicalNode('plugin-mention')] },
        }),
        defineRakunManagerPlugin({
          id: 'second.rich-text',
          richText: { nodes: [createLexicalNode('plugin-mention')] },
        }),
      ]),
    ).toThrow('registered by "first.rich-text" and "second.rich-text"')
  })

  it('rejects Lexical nodes that conflict with the built-in editor', () => {
    expect(() =>
      resolveRakunManagerPlugins([
        defineRakunManagerPlugin({
          id: 'paragraph.rich-text',
          richText: { nodes: [createLexicalNode('paragraph')] },
        }),
      ]),
    ).toThrow(
      'registered by "@rakun-kit/manager-react" and "paragraph.rich-text"',
    )
  })

  it('rejects duplicate Lexical plugin ids with both owners', () => {
    expect(() =>
      resolveRakunManagerPlugins([
        defineRakunManagerPlugin({
          id: 'first.rich-text',
          richText: {
            plugins: [{ id: 'shared.mention', component: PluginScreen }],
          },
        }),
        defineRakunManagerPlugin({
          id: 'second.rich-text',
          richText: {
            plugins: [{ id: 'shared.mention', component: PluginScreen }],
          },
        }),
      ]),
    ).toThrow('registered by "first.rich-text" and "second.rich-text"')
  })
})
