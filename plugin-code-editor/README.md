# @rakun-kit/plugin-code-editor

Lexical code block extension for Rakun `RichText` fields. It adapts the
[code plugin pattern from htmujahid/shadcn-editor](https://github.com/htmujahid/shadcn-editor):
code nodes, Prism syntax highlighting, a Code Block format, language selection,
and a copy action.

Register `codeEditorManagerPlugin` in the manager client runtime. No server
facet or custom field is required because code blocks are serialized inside the
normal Lexical state:

```tsx
import { codeEditorManagerPlugin } from '@rakun-kit/plugin-code-editor/manager'

<ManagerBrowserApp plugins={[codeEditorManagerPlugin]} {...props} />
```

To limit the languages shown to manager users, create a configured plugin:

```tsx
import { createCodeEditorManagerPlugin } from '@rakun-kit/plugin-code-editor/manager'

const codeEditorManagerPlugin = createCodeEditorManagerPlugin({
  languages: ['plaintext', 'json', 'javascript', 'typescript', 'html', 'css'],
})

<ManagerBrowserApp plugins={[codeEditorManagerPlugin]} {...props} />
```

Supported identifiers are `c`, `clike`, `cpp`, `css`, `html`, `java`, `js`,
`json`, `markdown`, `objc`, `plain`, `powershell`, `py`, `rust`, `sql`, `swift`,
`typescript`, and `xml`. Friendly aliases such as `javascript`, `plaintext`,
`python`, and `ts` are accepted too. Omitting `languages` keeps all languages
available.

Then use the regular RichText field:

```ts
import { ContentType, f } from '@rakun-kit/core'

const Article = new ContentType({
  name: 'Article',
  fields: {
    body: f.string().type('RichText'),
  },
})
```

Inside the editor, select **Code Block** from the block format menu. The toolbar
will expose the language selector while the cursor is inside that block.

## Migrating from 0.1

Version 0.2 removes the `/server` entrypoint, `codeField()`, and the standalone
CodeMirror field. Replace those fields with the standard `RichText` field and
keep only `codeEditorManagerPlugin` in the client-side manager registration.
