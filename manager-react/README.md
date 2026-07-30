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
