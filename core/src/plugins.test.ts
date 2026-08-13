import { describe, expect, it } from 'bun:test'
import { z } from 'zod'

import ContentType from './lib/ContentType'
import { createPluginField, sameSchemas } from './lib/fields'
import {
  defineRakunPlugin,
  resolveRakunPluginContributions,
  runRakunPluginInitializers,
  type RakunPluginInitContext,
} from './plugins'
import { defineOperation } from './api/operations'

const makeContentType = (name: string) =>
  new ContentType({
    name,
    fields: {
      title: createPluginField({
        meta: {
          type: 'String',
          ui: 'Text',
          editor: 'test.plugin.title',
          capabilities: { valueKind: 'string' },
        },
        schemas: sameSchemas(() => z.string()),
      }),
    },
  })

describe('Rakun plugins', () => {
  it('merges typed contributions in declaration order', () => {
    const contentType = makeContentType('PluginMergeArticle')
    const operation = defineOperation({
      access: 'public',
      kind: 'query',
      method: 'get',
      output: z.string(),
      resolve: () => 'ok',
    })
    const plugin = defineRakunPlugin({
      id: 'test.plugin',
      contentTypes: [contentType],
      routes: [
        {
          key: 'plugin-articles',
          contentType: contentType.name,
          field: 'title',
          hasPage: true,
          dynamic: false,
          defaultBasePath: '',
        },
      ],
      apiOperations: { 'plugin.test': operation },
      literals: {
        'plugin.title': {
          defaultMessage: 'Plugin',
          description: 'Plugin title',
        },
      },
      permissions: ['plugin.test.view'],
      fields: [{ id: 'test.plugin.title' }],
    })

    const resolved = resolveRakunPluginContributions({
      contentTypes: [],
      literals: {},
      plugins: [plugin],
    })

    expect(resolved.contentTypes).toEqual([contentType])
    expect(resolved.routes.map((route) => route.key)).toEqual(['plugin-articles'])
    expect(resolved.apiOperations['plugin.test']).toBe(operation)
    expect(resolved.literals['plugin.title']?.defaultMessage).toBe('Plugin')
    expect(resolved.permissions).toContain('plugin.test.view')
    expect(resolved.fields).toEqual([{ id: 'test.plugin.title' }])
  })

  it('reports both owners for collisions', () => {
    const duplicate = makeContentType('PluginDuplicateArticle')

    expect(() =>
      resolveRakunPluginContributions({
        contentTypes: [duplicate],
        literals: {},
        plugins: [
          defineRakunPlugin({
            id: 'duplicate.plugin',
            contentTypes: [duplicate],
            fields: [{ id: 'test.plugin.title' }],
          }),
        ],
      })
    ).toThrow('registered by "app" and "duplicate.plugin"')
  })

  it('rejects custom editors that were not declared by an installed plugin', () => {
    expect(() =>
      resolveRakunPluginContributions({
        contentTypes: [makeContentType('UndeclaredPluginField')],
        literals: {},
      })
    ).toThrow('uses undeclared plugin field editor "test.plugin.title"')
  })

  it('does not rerun successful initializers after a later failure', async () => {
    const calls: string[] = []
    let shouldFail = true
    const plugins = [
      defineRakunPlugin({
        id: 'initializer.first',
        initialize: () => calls.push('first'),
      }),
      defineRakunPlugin({
        id: 'initializer.second',
        initialize: () => {
          calls.push('second')
          if (shouldFail) throw new Error('retry me')
        },
      }),
    ]
    const initializedPluginIds = new Set<string>()
    const context = {} as RakunPluginInitContext

    await expect(
      runRakunPluginInitializers({ plugins, context, initializedPluginIds })
    ).rejects.toThrow('retry me')
    shouldFail = false
    await runRakunPluginInitializers({ plugins, context, initializedPluginIds })

    expect(calls).toEqual(['first', 'second', 'second'])
  })
})
