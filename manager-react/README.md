# @rakun-kit/manager-react

React manager UI and client utilities for Rakun.

Most apps use this package through framework adapters such as
`@rakun-kit/next/manager`, but the runtime components and clients are also
published for custom integrations.

## Browser App

Render the manager with a manager client and navigation implementation:

```tsx
import {
  ManagerBrowserApp,
  createHttpManagerClient,
} from "@rakun-kit/manager-react";
import "@rakun-kit/manager-react/styles.css";

const client = createHttpManagerClient({
  baseUrl: "/api/rakun",
});

export function ManagerPage() {
  return (
    <ManagerBrowserApp
      client={client}
      pathname={window.location.pathname}
      basePath="/backend"
    />
  );
}
```

`ManagerBrowserApp` creates browser path navigation by default. Use
`ManagerRuntimeApp` when you need to provide custom navigation.

## Clients

HTTP client:

```ts
import { createHttpManagerClient } from "@rakun-kit/manager-react/client/http";

const client = createHttpManagerClient({
  baseUrl: "/api/rakun",
});

const contentTypes = await client.request("manager.contentTypes");
```

tRPC client adapter:

```ts
import { createTrpcManagerClient } from "@rakun-kit/manager-react/client/trpc";

const managerClient = createTrpcManagerClient(trpcProxyClient);
```

Custom client:

```ts
import { createManagerClient } from "@rakun-kit/manager-react/client/request";

const client = createManagerClient(async (name, input, options) => {
  // call your transport here
});
```

## Navigation

Use `createPathManagerNavigation` for router integrations:

```ts
import { createPathManagerNavigation } from "@rakun-kit/manager-react/state/navigation";

const navigation = createPathManagerNavigation({
  basePath: "/backend",
  push: (href) => router.push(href),
  replace: (href) => router.replace(href),
});
```

## Link fields

The `f.link()` editor shows a title alongside its destination. Users can paste
or type a direct URL, choose the home page, or browse configured page-route
types and select one of their entries. Internal selections automatically use
the item label when the title is empty. Direct links are stored as
`{ href, title }`; internal links as `{ routeId, contentTypeId, title }` so core
can resolve localized paths. Persisted legacy URL strings are normalized to
`{ href, title: '' }` when loaded and remain editable.

Compound arrays such as `f.array(f.link())` are reorderable from their drag
handles in the Info editor, without losing unsaved values inside each item.

`f.menu()` provides a navigation-tree editor intended especially for headers.
Every item uses the same internal/direct destination picker as `f.link()` and
can contain child items. Drag vertically to reorder and horizontally to nest or
outdent; the level buttons provide the same operations for keyboard users.
Removing an item also removes its descendant subtree.

## Media uploads

Original file names may contain accents, non-Latin scripts, or emoji. The
manager transports those names through ASCII-safe upload headers and core
restores them before saving media metadata.

The optimization popover separates Image and Video settings through its Format
selector. Images retain their normal format and responsive-image controls;
videos have their own quality and are converted to both MP4 and WebM.

With optimization enabled in the media toolbar, an image or video's context
menu offers `Reimport`. It regenerates the configured outputs while retaining
the existing media record and all relations to it. Multi-select supports the
same reimport action from the selection toolbar. Optimization is on by default,
and generated image previews are stored as inline `data:image/...` LQIP values
on the media record.

## Dynamic data mappings

The list mapping editor supports recursive `blocks` targets. Select
`Nested list` for a mapped list property to configure its own source, query,
filters, item type, and field mapping. `Current document` query values inside
that nested editor resolve against the parent source item.

Arrays of links and arrays of relations, including `relation().multiple()`, can
choose `Direct field` to bind the whole array or `Nested list` to map every
source item. Link items show `title` and `href`; relation items show the fields
of the related content type. Unlike `blocks`, these homogeneous arrays do not
add a `{ name, value }` wrapper to resolved items.

When an array or `.multiple()` relation, file, select, or content-reference field
declares core `.min(count)` or `.max(count)` limits, its editor shows the current
count and configured range. It reports values outside that range and prevents
confirming or adding beyond the maximum.

A target link appears as separate `<field>.title` and `<field>.href` mapping
rows, so its label and destination can come from different source fields.

SEO field mappings can use compatible fields from the full current document.
New documents also honor core string-field `.seo('<seoField>')` configuration
as an editable initial dynamic data binding.

## llms.txt settings

Settings → AI content manages the optional, site-level `llms.txt` Markdown guide served to
AI tools. Editors can enable publishing, override the SEO-derived title and
summary, add guidance, and order sections containing internal pages or external
URLs. Marking a section as Secondary content places it under `## Optional`
while preserving its title as a subsection in the generated document. For content types with publication states, the internal
page picker only offers published documents. Nothing is added automatically
from the sitemap.

Authenticated manager layouts place a Visit site action at the top-right of the
logo block. It opens SEO `siteUrl` in a new tab, falling back to `/` on the
manager host until that setting is configured. A published document with a
resolved page route also gets a contextual View page button in its edit toolbar;
the URL follows the selected manager language and locale variant.

Routeable content splits its SEO tab into Metadata and Analysis. Generate
report renders the current unsaved form through the configured preview and
reports metadata lengths, heading structure, missing image alt attributes,
indexability, social metadata, rendered JSON-LD blocks, and Google and sharing
previews. JSON-LD results identify invalid JSON and missing `@context` or
`@type`. The report is advisory and is not stored. A protective `noindex` on
the temporary preview URL does not affect the content's indexability result.

## Styles

Import the package stylesheet once:

```ts
import "@rakun-kit/manager-react/styles.css";
```

## Manager languages

English and the locale runtime are built into this package. Extra translations
ship from a separate package:

```sh
bun add @rakun-kit/manager-locales
# or: npm install @rakun-kit/manager-locales
```

Import only the locale needed by the server bootstrap:

```ts
import { esManagerLocalePack } from '@rakun-kit/manager-locales/es'

rakunBootstrap({
  // ...
  managerLanguages: [esManagerLocalePack],
})
```

Each language has an independent subpath, so application bundlers only include
the locales explicitly imported by the host.

Content-type titles and categories can use project-defined message keys without
adding them to the built-in `ManagerMessageKey` union. Add an English partial
pack and extend installed locales through `managerLanguages`:

```ts
import { extendManagerLanguagePack } from '@rakun-kit/core/contracts'
import { esManagerLocalePack } from '@rakun-kit/manager-locales/es'

const managerLanguages = [
  {
    code: 'en',
    name: 'English',
    messages: {
      'field.title': 'Title',
      'layoutModule.header': 'Header',
      'project.contentTypes.article.menu': 'Articles',
    },
  },
  extendManagerLanguagePack(esManagerLocalePack, {
    'field.title': 'Título',
    'layoutModule.header': 'Cabecera',
    'project.contentTypes.article.menu': 'Artículos',
  }),
]
```

Then set `menu.title` or `menu.category` to that arbitrary key. Project keys are
resolved at runtime but remain outside the static manager catalog.

Field labels use the dynamic `field.<fieldName>` namespace. A content-type field
named `title`, for example, automatically resolves `field.title` in edit forms
and list columns without adding it to `ManagerMessageKey`.

Layout module labels follow `layoutModule.<layoutKey>`. For example, the
`header` slot automatically resolves `layoutModule.header` in its tab and
configuration panel.

## Event Logs

Settings → Logs displays the persistent Rakun event stream through the native
`manager.logs.list` operation. The screen supports filters, cursor pagination,
and structured event details. Both the settings card and the operation require
the `system.eventLog.read` permission, which can be assigned from Settings →
User Roles.

## Manager Plugins

Manager plugins run inside the normal providers and can add dashboard routes,
sidebar items, and custom field editors:

```tsx
import {
  defineRakunManagerPlugin,
  ManagerBrowserApp,
} from '@rakun-kit/manager-react'

const analyticsManagerPlugin = defineRakunManagerPlugin({
  id: '@acme/rakun-analytics',
  routes: [{
    id: 'dashboard',
    path: '/analytics',
    component: AnalyticsScreen,
    permissions: ['plugin.analytics.view'],
  }],
  sidebar: [{
    id: 'analytics',
    title: 'Analytics',
    routeId: 'dashboard',
    position: 'primary',
    group: 'Plugins',
  }],
  fieldEditors: {
    '@acme/rakun-analytics.query': QueryEditor,
  },
})

<ManagerBrowserApp plugins={[analyticsManagerPlugin]} {...props} />
```

Use `ManagerFieldEditorProps`, `ManagerFieldEditorRef`, and
`useManagerFieldValue` from `@rakun-kit/manager-react/plugins` when implementing
field editors. Next.js applications should import plugin objects inside a
`'use client'` wrapper around `RakunManagerClientPage`; `RakunManagerPage` accepts
that wrapper through `managerComponent`.

### Extending the RichText editor

Manager plugins can register Lexical nodes and React plugins for every
`RichText` field, including fields rendered inside relations, blocks, and
modules:

```tsx
'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  defineRakunManagerPlugin,
  type ManagerRichTextPluginProps,
} from '@rakun-kit/manager-react/plugins'
import { MentionNode } from './MentionNode'

const MentionsPlugin = ({ id }: ManagerRichTextPluginProps) => {
  const [editor] = useLexicalComposerContext()

  // Register commands and listeners on `editor` here.
  return null
}

export const mentionsManagerPlugin = defineRakunManagerPlugin({
  id: '@acme/rakun-mentions',
  richText: {
    nodes: [MentionNode],
    plugins: [
      {
        id: '@acme/rakun-mentions.plugin',
        component: MentionsPlugin,
        placement: 'editor',
      },
    ],
  },
})
```

Lexical plugin components receive `ManagerRichTextPluginProps` (the field id,
configuration, current content type, and related field metadata) and render
inside `LexicalComposer`, so they can use the normal Lexical React hooks.
Supported placements are `toolbar`, `block-format`, `editor` (the default),
`actions-start`, and `actions-end`. `block-format` components render inside the
manager's block selector and can use `ManagerRichTextBlockFormatItem` from
`@rakun-kit/manager-react/rich-text`. Contributions keep declaration order
unless an explicit `order` is provided. Node types and plugin ids must be unique;
conflicts report both plugin owners. Node replacements use Lexical's standard
`LexicalNodeReplacement` configuration.

## Exports

- `@rakun-kit/manager-react`: manager app, providers, clients, navigation, router, layout, media, and state helpers.
- `@rakun-kit/manager-react/client/http`: HTTP manager client.
- `@rakun-kit/manager-react/client/request`: transport-agnostic manager client.
- `@rakun-kit/manager-react/client/trpc`: tRPC proxy client adapter.
- `@rakun-kit/manager-react/app/runtime-app`: `ManagerRuntimeApp`, `ManagerBrowserApp`.
- `@rakun-kit/manager-react/state/navigation`: navigation helpers and provider.
- `@rakun-kit/manager-react/link`: link component provider.
- `@rakun-kit/manager-react/i18n`: locale runtime, catalog, and locale types.
- `@rakun-kit/manager-react/styles.css`: bundled manager styles.

## Build

```sh
bun run build --workspace @rakun-kit/manager-react
```
