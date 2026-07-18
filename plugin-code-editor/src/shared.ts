export const CODE_EDITOR_PLUGIN_ID = '@rakun-kit/plugin-code-editor'
export const CODE_EDITOR_FIELD_ID = `${CODE_EDITOR_PLUGIN_ID}.code`

export const codeLanguages = [
  'text',
  'json',
  'javascript',
  'typescript',
  'html',
  'css',
] as const

export type CodeLanguage = (typeof codeLanguages)[number]
