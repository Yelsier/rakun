# @rakun-kit/plugin-code-editor

CodeMirror 6 field editor plugin for Rakun.

```ts
import { codeEditorPlugin, codeField } from '@rakun-kit/plugin-code-editor/server'

const Snippet = new ContentType({
  name: 'Snippet',
  fields: {
    source: codeField({ language: 'typescript', minHeight: 320 }).required(),
  },
})

rakunBootstrap({
  plugins: [codeEditorPlugin],
  contentTypes: [Snippet],
  // ...
})
```

Register `codeEditorManagerPlugin` in the manager client runtime:

```tsx
import { codeEditorManagerPlugin } from '@rakun-kit/plugin-code-editor/manager'

<ManagerBrowserApp plugins={[codeEditorManagerPlugin]} {...props} />
```
