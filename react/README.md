# @rakun-kit/react

React helpers for rendering Rakun web modules.

Apps provide a module registry, so framework adapters stay open:

```tsx
import { createModuleRegistry, ModuleRenderer } from "@rakun-kit/react";

const registry = createModuleRegistry({
  Hero: () => import("./modules/Hero"),
  Footer: () => import("./modules/Footer"),
});

export function Page({ modules }) {
  return <ModuleRenderer modules={modules} registry={registry} />;
}
```

Vite, Next, and custom adapters can all feed the same renderer with different
loading strategies.

With Vite, use `import.meta.glob`:

```tsx
import { createModuleRegistryFromGlob, ModuleRenderer } from "@rakun-kit/react";

const registry = createModuleRegistryFromGlob(
  import.meta.glob("./modules/*.{tsx,jsx}"),
);

export function Page({ modules }) {
  return <ModuleRenderer modules={modules} registry={registry} />;
}
```

The default key is the file name without extension, so `./modules/Hero.tsx`
matches a Rakun module with `_type: "Hero"`.

For nested folders or custom names:

```tsx
const registry = createModuleRegistryFromGlob(
  import.meta.glob("./modules/**/*.tsx"),
  {
    getName: (path) => path.split("/").at(-2),
  },
);
```

With Next, keep the dynamic import in app code:

```tsx
import { ModuleRenderer } from "@rakun-kit/react";

export function Page({ modules }) {
  return (
    <ModuleRenderer
      modules={modules}
      loadModule={(name) => import(`@/modules/${name}`)}
    />
  );
}
```

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
import { PageLayoutRenderer } from "@rakun-kit/react";

export function Page({ page }) {
  return (
    <PageLayoutRenderer
      page={page}
      loadModule={(name) => import(`@/modules/${name}`)}
      renderContent={({ children }) => <main>{children}</main>}
    />
  );
}
```

Given a layout like `header -> content -> footer`, only the content modules are
wrapped in `<main>`.
