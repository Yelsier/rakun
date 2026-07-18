import { describe, expect, it } from 'bun:test'

import { codeEditorPlugin, codeField, CODE_EDITOR_FIELD_ID } from './server'

describe('code editor plugin', () => {
  it('creates a string field with serializable editor options', () => {
    const field = codeField({ language: 'typescript', minHeight: 320 })

    expect(field.getSchema().parse('const value = 1')).toBe('const value = 1')
    expect(field.getConfig()).toEqual({
      type: 'String',
      ui: 'Textarea',
      editor: CODE_EDITOR_FIELD_ID,
      language: 'typescript',
      minHeight: 320,
    })
    expect(field.required().getIsRequired()).toBe(true)
    expect(field.translatable().getIsTranslatable()).toBe(true)
    expect(field.noDynamic().getIsDynamic()).toBe(false)
  })

  it('declares the manager editor in its server facet', () => {
    expect(codeEditorPlugin.fields).toEqual([{ id: CODE_EDITOR_FIELD_ID }])
  })
})
