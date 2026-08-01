# `@rakun-kit/manager-react` AI usage manual

This package is the publishable React manager, its transport clients,
navigation abstraction, locale runtime, plugin API and CSS. Most Next.js apps
should use `@rakun-kit/next/manager`; use this package directly for custom
React hosts.

Read the core manual at
`node_modules/@rakun-kit/core/dist/docs/index.md` before changing manager/server
contracts.

## Install and mount

```sh
bun add @rakun-kit/manager-react react react-dom
```

```tsx
import { ManagerBrowserApp, createHttpManagerClient } from '@rakun-kit/manager-react'
import '@rakun-kit/manager-react/styles.css'

const client = createHttpManagerClient({ baseUrl: '/api/rakun' })

export function ManagerPage() {
  return (
    <ManagerBrowserApp client={client} pathname={window.location.pathname} basePath="/backend" />
  )
}
```

Import the stylesheet exactly once. `ManagerBrowserApp` owns browser-history
navigation. Use `ManagerRuntimeApp` when the host supplies navigation.

## Clients and navigation

- HTTP: `createHttpManagerClient` from `/client/http`.
- tRPC: `createTrpcManagerClient` from `/client/trpc`.
- Custom transport: `createManagerClient` from `/client/request`.
- Router bridge: `createPathManagerNavigation` from `/state/navigation`.

Use operation names and payloads from Rakun contracts; do not recreate endpoint
types in host code. Keep `baseUrl` (API) distinct from `basePath` (manager UI).

## Link field picker

The `f.link()` editor uses one input for direct and internal destinations. A
typed or pasted URL is stored as a string. Opening the picker exposes the home
page and configured page-route types with their content type icons; selecting a
type opens its searchable entry list. Internal selections are stored as
`{ routeId, contentTypeId }` so core can resolve localized paths.

## Manager plugins

```tsx
import {
  defineRakunManagerPlugin,
  ManagerBrowserApp,
} from '@rakun-kit/manager-react'

const plugin = defineRakunManagerPlugin({
  id: '@acme/analytics',
  routes: [{
    id: 'dashboard',
    path: '/analytics',
    component: AnalyticsScreen,
    permissions: ['plugin.analytics.view'],
  }],
  sidebar: [{
    id: 'analytics',
    title: 'analytics.title',
    routeId: 'dashboard',
    position: 'primary',
    group: 'Plugins',
  }],
})

<ManagerBrowserApp plugins={[plugin]} {...props} />
```

Plugins can contribute routes, sidebar entries, custom field editors and
RichText extensions. Use exported plugin types from
`@rakun-kit/manager-react/plugins`. Plugin ids, route ids, field editor ids,
Lexical node types and RichText plugin ids must be unique.

In Next.js, plugin registration belongs in a `'use client'` wrapper around
`RakunManagerClientPage`; pass the wrapper to `RakunManagerPage` as
`managerComponent`.

## Languages and copy

English is built in. Additional server-provided UI packs come from
`@rakun-kit/manager-locales` and are configured in core `managerLanguages`.
Content editing locale and manager UI locale are separate states.

Built-in manager copy must use the static manager translation catalog. Project
labels may use arbitrary project keys. Fields resolve `field.<fieldName>` and
layout slots resolve `layoutModule.<layoutKey>` with fallbacks.

## Public entrypoints

- `@rakun-kit/manager-react`: manager apps, providers and common helpers.
- `/client/http`, `/client/request`, `/client/trpc`: manager transports.
- `/app/runtime-app`: runtime/browser app components.
- `/state/navigation`, `/state/theme`, `/link`: host integration primitives.
- `/plugins`, `/rich-text`: plugin and RichText extension contracts.
- `/i18n`: locale runtime, catalog and locale types.
- `/styles.css`: required bundled styles.

## Agent constraints

- This package can run outside Next.js; do not assume Next navigation or server
  components.
- Do not import the main React entrypoint into server bootstrap just to obtain
  locale types or data.
- Permission-gate protected UI, and handle loading, empty and error states.
- Use existing manager components and operations before adding parallel APIs.
- Keep manager/core schemas synchronized when an operation changes.
- Do not hardcode user-facing manager copy.
