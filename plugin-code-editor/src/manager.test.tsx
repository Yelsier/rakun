import { describe, expect, it } from 'bun:test'
import {
  $createCodeNode,
  CodeHighlightNode,
  CodeNode,
  getCodeLanguages,
} from '@lexical/code'
import { createEditor, $getRoot, $createTextNode } from 'lexical'

import {
  codeEditorManagerPlugin,
  createCodeEditorManagerPlugin,
} from './manager'

describe('code editor manager plugin', () => {
  it('registers code nodes and the shadcn-editor contribution points', () => {
    expect(
      codeEditorManagerPlugin.richText?.nodes?.map((node) =>
        typeof node === 'function' ? node.getType() : node.replace.getType(),
      ),
    ).toEqual(['code', 'code-highlight'])
    expect(
      codeEditorManagerPlugin.richText?.plugins?.map(({ placement }) => placement),
    ).toEqual(['block-format', 'toolbar', 'editor', 'editor'])
  })

  it('serializes code blocks through the normal Lexical RichText state', () => {
    const editor = createEditor({ nodes: [CodeNode, CodeHighlightNode] })

    editor.update(
      () => {
        const code = $createCodeNode('typescript')
        code.append($createTextNode('const answer: number = 42'))
        $getRoot().append(code)
      },
      { discrete: true },
    )

    const serialized = editor.getEditorState().toJSON()
    expect(serialized.root.children[0]).toMatchObject({
      type: 'code',
      language: 'typescript',
    })
    expect(serialized.root.children[0]?.children?.[0]).toMatchObject({
      text: 'const answer: number = 42',
    })
  })

  it('creates a plugin with a project-specific language list', () => {
    const plugin = createCodeEditorManagerPlugin({
      languages: ['plaintext', 'json', 'javascript', 'typescript'],
    })

    expect(plugin.id).toBe('@rakun-kit/plugin-code-editor')
    expect(plugin.richText?.plugins?.map(({ placement }) => placement)).toEqual([
      'block-format',
      'toolbar',
      'editor',
      'editor',
    ])
    expect(getCodeLanguages()).toContain('json')
  })

  it('rejects empty and unsupported language lists', () => {
    expect(() =>
      createCodeEditorManagerPlugin({ languages: [] }),
    ).toThrow('must not be empty')
    expect(() =>
      createCodeEditorManagerPlugin({
        languages: ['elixir' as 'plain'],
      }),
    ).toThrow('Unsupported code editor language "elixir"')
  })
})
