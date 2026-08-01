# `@rakun-kit/react` AI usage manual

Use this package to render Rakun web modules in React without coupling module
registration to a framework. For Next.js server rendering, prefer the higher
level helpers in `@rakun-kit/next/web` and read that package manual.

## Install and create a registry

```sh
bun add @rakun-kit/core @rakun-kit/react react react-dom
```

```tsx
import { createModuleRegistry, ModuleRenderer } from '@rakun-kit/react'

const registry = createModuleRegistry({
  Hero: () => import('./modules/Hero'),
  Footer: () => import('./modules/Footer'),
})

export function Page({ modules }) {
  return <ModuleRenderer modules={modules} registry={registry} />
}
```

Registry keys must match module `_type` values. A module file exports either a
default component or a named `component`.

For Vite, `createModuleRegistryFromGlob(import.meta.glob(...))` maps file names
to module names. Pass `getName` for nested or nonstandard layouts. For Next.js,
keep `(name) => import(...)` in application code so the bundler can see the
dynamic import.

## Layouts and plugins

Use `PageLayoutRenderer` for page responses with fixed layout slots. Its
`renderContent` callback wraps only the modules at the `{ type: 'content' }`
slot.

Web plugins are explicit browser/runtime facets:

```tsx
import {
  defineRakunWebPlugin,
  mergeRakunModuleRegistries,
  PageLayoutRenderer,
} from '@rakun-kit/react'

const plugin = defineRakunWebPlugin({
  id: '@acme/marketing',
  modules: { CampaignHero: () => import('./CampaignHero') },
})

const registry = mergeRakunModuleRegistries({
  modules: appModules,
  plugins: [plugin],
})
```

Plugin ids and module names must be unique. A web plugin does not register its
server content types or operations; register the corresponding core plugin in
server bootstrap separately.

## Public entrypoints and constraints

- `@rakun-kit/react`: registries and module/page renderers.
- `@rakun-kit/react/plugins`: web plugin contracts and registry composition.
- `@rakun-kit/react/translation`: React translation helpers.

Do not deep-import package internals. Preserve the exact module data supplied by
Rakun when passing props to renderers. Isolate client-only modules instead of
forcing the entire page renderer into the client bundle.
