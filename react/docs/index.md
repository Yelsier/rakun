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
to module names. Pass `getName` for nested or nonstandard layouts. When using
the client `ModuleRenderer` with Next.js, define `(name) => import(...)` inside
a client module so the function does not cross the server boundary and the
bundler can see the dynamic import.

## Render nested modules on the server

Use `ServerModuleRenderer` inside React Server Components. Unlike
`ModuleRenderer`, it has no client boundary and awaits every module import on
the server:

```tsx
import { ServerModuleRenderer } from '@rakun-kit/react'

export default async function SectionLayout({ blocks = [] }) {
  const modules = blocks.map(({ name, value }) => ({
    ...value,
    _type: name,
  }))

  return (
    <ServerModuleRenderer
      modules={modules}
      loadModule={(name) => import(`./${name}`)}
    />
  )
}
```

The server renderer accepts either `loadModule` or the same `registry` used by
the client renderer. It also accepts `missing` and `getKey`. Use the client
`ModuleRenderer` when Suspense fallbacks or viewport lazy loading are required.

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

## Images

`Image` / `RakunImage` builds a responsive `srcSet` from media `sizes` and
accepts a layout `sizes` attribute so the browser picks an appropriate width.
When `previewUrl` is a `data:image/...` LQIP string, it is used as the image
background while the full asset loads. Pass `usePreview` to render the preview
string/URL as the primary `src` instead.

```tsx
import { Image } from '@rakun-kit/react'

export function HeroImage({ image }) {
  return <Image image={image} sizes="(max-width: 768px) 100vw, 50vw" />
}
```

## Public entrypoints and constraints

- `@rakun-kit/react`: registries and module/page renderers.
- `@rakun-kit/react/plugins`: web plugin contracts and registry composition.
- `@rakun-kit/react/translation`: React translation helpers.

Do not deep-import package internals. Preserve the exact module data supplied by
Rakun when passing props to renderers. Isolate client-only modules instead of
forcing the entire page renderer into the client bundle.
