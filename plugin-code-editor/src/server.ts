import { createPluginField, defineRakunPlugin, sameSchemas } from '@rakun-kit/core'
import { z } from 'zod'

import {
  CODE_EDITOR_FIELD_ID,
  CODE_EDITOR_PLUGIN_ID,
  codeLanguages,
  type CodeLanguage,
} from './shared'

export {
  CODE_EDITOR_FIELD_ID,
  CODE_EDITOR_PLUGIN_ID,
  codeLanguages,
  type CodeLanguage,
} from './shared'

export type CodeFieldOptions = {
  language?: CodeLanguage
  minHeight?: number
}

export const codeField = (options: CodeFieldOptions = {}) =>
  createPluginField({
    meta: {
      type: 'String',
      ui: 'Textarea',
      editor: CODE_EDITOR_FIELD_ID,
      language: options.language ?? 'text',
      minHeight: options.minHeight,
    },
    schemas: sameSchemas(() => z.string()),
  })

export const codeEditorPlugin = defineRakunPlugin({
  id: CODE_EDITOR_PLUGIN_ID,
  fields: [{ id: CODE_EDITOR_FIELD_ID }],
})
