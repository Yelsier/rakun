# @rakun-kit/react

React helpers for rendering Rakun web modules.

The package also exports `RakunLogoMark` and `RakunLogoBadge` for Rakun-owned
development and manager UI. `JsonViewer` provides the shared collapsible JSON
tree used by Rakun debugging interfaces; use `defaultExpandedDepth={-1}` when
the root should start collapsed.

Apps provide a module registry, so framework adapters stay open:

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

Vite, Next, and custom adapters can all feed the same renderer with different
loading strategies.

With Vite, use `import.meta.glob`:

```tsx
import { createModuleRegistryFromGlob, ModuleRenderer } from '@rakun-kit/react'

const registry = createModuleRegistryFromGlob(import.meta.glob('./modules/*.{tsx,jsx}'))

export function Page({ modules }) {
  return <ModuleRenderer modules={modules} registry={registry} />
}
```

The default key is the file name without extension, so `./modules/Hero.tsx`
matches a Rakun module with `_type: "Hero"`.

For nested folders or custom names:

```tsx
const registry = createModuleRegistryFromGlob(import.meta.glob('./modules/**/*.tsx'), {
  getName: (path) => path.split('/').at(-2),
})
```

With Next, keep the dynamic import inside a client module when using
`ModuleRenderer`:

```tsx
'use client'

import { ModuleRenderer } from '@rakun-kit/react'

export function Page({ modules }) {
  return <ModuleRenderer modules={modules} loadModule={(name) => import(`@/modules/${name}`)} />
}
```

For nested modules rendered by a React Server Component, use
`ServerModuleRenderer`. It resolves every import on the server, so its loader
does not cross a server-to-client boundary:

```tsx
import { ServerModuleRenderer } from '@rakun-kit/react'

export default async function SectionLayout({ blocks = [] }) {
  const modules = blocks.map(({ name, value }) => ({
    ...value,
    _type: name,
  }))

  return <ServerModuleRenderer modules={modules} loadModule={(name) => import(`./${name}`)} />
}
```

Use the client `ModuleRenderer` when viewport lazy loading or client-side module
loading is required. `ServerModuleRenderer` also accepts a `registry` and a
`missing` renderer, but intentionally has no client-only lazy-loading props.

Both renderers handle Rakun's built-in `StructuredData` module without a loader
entry and emit a safely escaped `application/ld+json` script. An explicit
registry entry named `StructuredData` overrides the native renderer. The package
also exports `StructuredData`, `buildStructuredData`, and `serializeJsonLd` for
direct use.

Web plugins package module registries that the application explicitly merges:

```tsx
import {
  defineRakunWebPlugin,
  mergeRakunModuleRegistries,
  PageLayoutRenderer,
} from '@rakun-kit/react'

const marketingWebPlugin = defineRakunWebPlugin({
  id: '@acme/rakun-marketing',
  modules: {
    CampaignHero: () => import('./CampaignHero'),
  },
})

const registry = mergeRakunModuleRegistries({
  modules: appModules,
  plugins: [marketingWebPlugin],
})

<PageLayoutRenderer page={page} registry={registry} />
```

Duplicate plugin ids or module names fail immediately. Next.js users can pass
the same web facets to `createRakunPageModuleLoader` from `@rakun-kit/next/web`.

This is intentionally a function instead of a path string: Next needs to see the
dynamic import from inside the application bundle.

Use `PageLayoutRenderer` when Rakun returns layout slots:

```tsx
import { PageLayoutRenderer } from '@rakun-kit/react'

export function Page({ page }) {
  return (
    <PageLayoutRenderer
      page={page}
      loadModule={(name) => import(`@/modules/${name}`)}
      renderContent={({ children }) => <main>{children}</main>}
    />
  )
}
```

Given a layout like `header -> content -> footer`, only the content modules are
wrapped in `<main>`.

Media returned by Rakun can be rendered with the package's `Image` and `Video`
components. `Video` puts WebM before MP4, allowing the browser to prefer WebM
when it is supported and fall back to MP4 otherwise:

```tsx
import { Image, Video } from '@rakun-kit/react'

<Image image={hero.image} sizes="100vw" />
<Video video={hero.video} controls playsInline />
```
