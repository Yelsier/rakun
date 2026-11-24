# `@rakun-kit/plugin-code-editor` AI usage manual

Use this manager-only plugin to add Lexical code blocks, Prism highlighting,
language selection and copy actions to ordinary Rakun `RichText` fields.

## Install and register

```sh
bun add @rakun-kit/plugin-code-editor
```

```tsx
import { codeEditorManagerPlugin } from '@rakun-kit/plugin-code-editor/manager'
;<ManagerBrowserApp plugins={[codeEditorManagerPlugin]} {...props} />
```

For a restricted language list:

```tsx
import { createCodeEditorManagerPlugin } from '@rakun-kit/plugin-code-editor/manager'

const plugin = createCodeEditorManagerPlugin({
  languages: ['plaintext', 'json', 'javascript', 'typescript', 'html', 'css'],
})
```

Use it with the standard field definition:

```ts
import { ContentType, f } from '@rakun-kit/core'

const Article = new ContentType({
  name: 'Article',
  fields: { body: f.string().type('RichText') },
})
```

The only public entrypoint is `@rakun-kit/plugin-code-editor/manager`. It must
be imported and registered in client-side manager code. In Next.js, use a
`'use client'` manager wrapper as described in the `@rakun-kit/next` manual.

No server facet, custom field or CodeMirror state is required: code blocks are
serialized in normal Lexical state. Do not use the removed `/server` entrypoint
or the removed `codeField()` API from pre-0.2 integrations.
