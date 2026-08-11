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

The `f.link()` editor always shows Title and Destination inputs. A typed or
pasted URL is stored as `{ href, title }`. Opening the destination picker
exposes the home page and configured page-route types with their content type
icons; selecting an item fills an empty title from its manager label and stores
`{ routeId, contentTypeId, title }` so core can resolve localized paths.
Persisted string values are normalized to `{ href, title: '' }` when loaded;
untitled internal references also remain editable.

Compound arrays such as `f.array(f.link())` render each value as a reorderable
card in the Info editor. Use the drag handle to change their persisted order;
current nested input values are preserved while an item is moved.

## Media uploads

The manager preserves Unicode original file names when uploading media. Names
with accents, non-Latin scripts, or emoji are encoded into ASCII for the binary
upload headers and restored by core before metadata is saved.

When optimization is enabled, right-click an image and select `Reimport with
current optimization` to regenerate its optimized source, preview, and
responsive sizes. The action keeps the existing media ID, title, alt text,
folder, and content references. You can also multi-select images and use the
selection toolbar reimport action. Optimization is enabled by default in the
media library; generated previews are stored as inline `data:image/...`
strings on the media record for LQIP use.

Gallery and file-field image previews use `@rakun-kit/react` `Image` with a
layout-appropriate `sizes` value so responsive variants are selected when
available.

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

The authenticated sidebar places Visit site at the top-right of its logo block.
It opens the validated SEO `siteUrl` in a new tab and falls back to `/` on the
current manager host when the setting is empty. Custom dashboard layout
renderers receive `siteUrl` in their layout props and should preserve an
equivalent action. On a published routed document, the edit toolbar also shows
View page for the exact selected language and locale variant. Draft, hidden,
trashed, and route-less documents do not show that contextual action.

## Content and template tabs

For a routeable content type with `iterator`, Content edits the `_iterator`
modules unique to the current document. Template is enabled automatically and
edits one shared composition for every document of that type. Both tabs offer
the same configured iterator modules. The Template module picker additionally
adds a built-in Content item at its root and inside blocks fields; it marks the
exact position where the current document's Content modules are inserted.

Template changes require the content type's `updateAny` permission and are
saved with optimistic revision checks. Preview includes unsaved changes from
both tabs.

## Dynamic data mappings

List bindings use a type-aware mapping editor. When a mapped target property is
itself a `blocks` field, choose `Nested list` to open another collection, query,
filter, and mapping editor for that property. Nested query conditions can select
`Current item` to read the parent source item at that level, or `Current
document` to read the root document. This supports mappings such as Category ->
gallery item -> Project -> image card, and the editor can repeat the flow for
deeper block structures.

Homogeneous arrays of links or relations can use either `Direct field` for the
complete array or `Nested list` for per-item mapping. This also covers core
`relation().multiple()` fields. Link items expose `title` and `href`, while
relation items expose their target content type fields; their result remains a
flat array rather than the heterogeneous `{ name, value }` shape used by
`blocks`.

Target link fields are expanded into visible `<field>.title` and `<field>.href`
rows. Each property can select its own compatible source and core reconstructs
the mapped link object.

In the SEO tab, `Current document` exposes compatible fields from the complete
document (including fields edited in Info), while the reserved `_seo` relation
itself stays excluded as a source. On create forms, string fields configured in
core with `.seo('<seoField>')` appear as normal preconfigured dynamic bindings;
editors can replace or clear them before the first save.

## llms.txt settings

Settings → AI content edits the optional site-level `llms.txt` guide. Publishing is off
by default. Editors may override the SEO-derived site title and summary, add
Markdown guidance, and curate ordered sections of internal pages or external
URLs. Sections marked as Secondary content appear as titled subsections under
`## Optional`; Rakun never copies the complete sitemap into this document automatically. Internal page choices
are limited to published documents when their content type uses publication
states.

## Confirmations

Use the shared async confirm API instead of ad-hoc yes/no dialogs:

```tsx
import { confirm, useConfirm } from '@rakun-kit/manager-react'

const result = await confirm({
  title: 'Delete item',
  description: 'This cannot be undone.',
  confirmLabel: 'Delete',
  variant: 'destructive',
  onConfirm: async () => {
    await deleteItem()
  },
})

// 'confirmed' | 'cancelled' | 'dismissed'
if (result !== 'confirmed') return

// Or boolean helper:
if (!(await confirm.yes({ title: 'Continue?' }))) return
```

`ConfirmProvider` is mounted by `ManagerRuntimeApp` / `ManagerBrowserApp`.
`onConfirm` keeps the dialog open with a loading button until the promise
settles; thrown errors leave it open.

## Public entrypoints

- `@rakun-kit/manager-react`: manager apps, providers and common helpers.
- `/client/http`, `/client/request`, `/client/trpc`: manager transports.
- `/app/runtime-app`: runtime/browser app components.
- `/state/navigation`, `/state/theme`, `/link`: host integration primitives.
- `/plugins`, `/rich-text`: plugin and RichText extension contracts.
- `/i18n`: locale runtime, catalog and locale types.
- `confirm` / `useConfirm` / `ConfirmProvider`: shared async confirmation dialogs.
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
