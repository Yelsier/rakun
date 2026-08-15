# @rakun-kit/next

Next.js App Router adapter for Rakun. It provides a catch-all route handler,
optional tRPC mounting, local media handlers, and a manager page component.

## API Route Handler

Create a catch-all App Router route and export the methods returned by
`rakunNext`:

```ts
// app/api/rakun/[...slug]/route.ts
import { rakunNext } from '@rakun-kit/next'

export const { GET, POST, PUT } = rakunNext({
  bootstrap: {
    literals,
    contentTypes: [Page, Post],
    mongo: {
      MONGO_URI: process.env.MONGO_URI!,
    },
  },
})
```

By default, the handler:

- calls `ensureRakunBootstrap(bootstrap)` when `bootstrap` is provided.
- calls `ensureRakunInitialized()` before each request.
- serves `GET /api/rakun/health` unless `healthPath` is `false`.
- serves Rakun operation routes through `rakunNextCrud()`.
- serves media upload routes when media is configured.

Options:

```ts
type RakunNextOptions = {
  bootstrap?: RakunBootstrapOptions
  healthPath?: string | false
  integrations?: RakunNextIntegration[]
}
```

Use `integrations` for extra handlers. Each integration receives the Fetch
`Request`, Next route context, and normalized path segments. The first
integration that returns a `Response` wins.

## tRPC

Mount a tRPC router in the same catch-all route with `@rakun-kit/next/trpc`:

```ts
// app/api/rakun/[...slug]/route.ts
import { rakunNext, rakunNextCrud } from '@rakun-kit/next'
import { rakunNextTrpc } from '@rakun-kit/next/trpc'
import { appRouter } from '@/server/trpc'

export const { GET, POST, PUT } = rakunNext({
  bootstrap,
  integrations: [
    rakunNextCrud(),
    rakunNextTrpc({
      path: 'trpc',
      router: appRouter,
    }),
  ],
})
```

The tRPC integration creates a Rakun request context from Fetch API headers,
cookies, and response headers.

## Security Headers

When serving the manager and preview on known origins, configure your host to
send a `Content-Security-Policy` with a narrow `frame-ancestors` directive, for
example:

```txt
Content-Security-Policy: frame-ancestors 'self' https://manager.example.com
```

## Web Pages

When the API and website live in the same Next.js application, create a
database-backed helper from the same Rakun bootstrap:

```ts
// server/web.ts
import { createRakunDatabaseWeb } from '@rakun-kit/next/web'
import { createRakunBootstrap } from './bootstrap'

export const rakunWeb = createRakunDatabaseWeb({ bootstrap: createRakunBootstrap })
```

```tsx
// app/[[...slug]]/page.tsx
import {
  createRakunPageMetadata,
  RakunPageRenderer,
  type RakunNextPageProps,
} from '@rakun-kit/next/web'
import { rakunWeb } from '@/server/web'

export const generateStaticParams = rakunWeb.generateStaticParams

export async function generateMetadata(props: RakunNextPageProps) {
  const page = await rakunWeb.getPageFromProps(props)

  return createRakunPageMetadata(page)
}

export default async function Page(props: RakunNextPageProps) {
  const page = await rakunWeb.getPageFromProps(props)

  return <RakunPageRenderer page={page} loadModule={(name) => import(`@/modules/${name}`)} />
}
```

`RakunPageRenderer` is a server component renderer. Modules are server modules
by default, so they can fetch data and render without client JavaScript. If a
module needs hooks or browser events, add `"use client"` at the top of that
module file; Next.js will make only that module a client component.
The built-in `StructuredData` module is rendered natively before
`loadModule`, so it does not need a `modules/StructuredData.tsx` file. Add it to
a routable iterator or shared Template and map its fields dynamically when the
same schema applies to every document of that type.
When a Rakun page response includes a redirect, the renderer calls the matching
Next.js redirect helper before rendering modules.

In development, `RakunPageRenderer` automatically adds a compact Rakun toolbar
to normal web pages. It shows the current route and document, links to the
manager edit screen, lists rendered content/template/layout modules, highlights
the selected module on the page, and displays the props received by that
module. Manager preview pages keep using their dedicated inspector and do not
show the development toolbar.

When minimized, only the floating Rakun logo is shown. Use **Hide** to remove
the toolbar for the current page view; it becomes available again after a
reload or navigation.

The manager is assumed to live at `/backend`. Configure a different mount path,
open the toolbar initially, or disable it explicitly:

```tsx
<RakunPageRenderer
  page={page}
  loadModule={loadModule}
  devToolbar={{ managerBasePath: '/manager', initialOpen: true }}
/>

<RakunPageRenderer page={page} loadModule={loadModule} devToolbar={false} />
```

Passing `true` enables it explicitly outside development; avoid doing that on a
public production site because module props may contain non-public debugging
context.

Module files should export either `default` or `component`:

```tsx
// modules/Hero.tsx
export default function Hero({ title }: { title: string }) {
  return <section>{title}</section>
}
```

Web plugin registries can be converted into the loader expected by the Next
renderer:

```tsx
import { createRakunPageModuleLoader, RakunPageRenderer } from '@rakun-kit/next/web'

const loadModule = createRakunPageModuleLoader({
  plugins: [marketingWebPlugin],
  fallback: (name) => import(`@/modules/${name}`),
})

return <RakunPageRenderer page={page} loadModule={loadModule} />
```

`createRakunDatabaseWeb` initializes Rakun and reads pages and static paths
directly from MongoDB, so `next build` does not depend on the application's own
Route Handlers. Static pages use Next's data cache with Rakun's TTL; dynamic
and preview pages remain uncached. The root of an optional catch-all is emitted
as `{ slug: [] }`, as required for Next to retain the complete generated set.

For a separately deployed API, keep using `createRakunGenerateStaticParams`,
`getRakunPage`, and `getRakunPageFromProps`. The absolute `apiBaseUrl` must be
reachable during `next build`.

In production, `getRakunPage` and `getRakunPageFromProps` automatically cache
those static page queries with Rakun's TTL. Dynamic pages and previews remain
`no-store`, and development queries are not cached. Cacheable queries do not
forward request cookies or headers. Explicit fetch caching options override
automatic selection:

```ts
await getRakunPage({
  path: '/',
  fetchOptions: {
    next: { revalidate: 86400 },
  },
})
```

`getRakunPageFromProps` deliberately awaits `searchParams` only for dynamic
routes; doing so for a static route would opt it into dynamic rendering. Keep
preview rendering in a separate dynamic route.

`RakunPageRenderer` automatically adds the preview bridge to preview pages.
The bridge supports live updates, module selection, and the manager's rendered
SEO report. The report combines resolved Rakun SEO metadata with the rendered
heading, image, and JSON-LD structure, sanitizes the preview token, and ignores
protective `noindex` metadata added only by the host preview route.

### On-demand revalidation

Mount the Next revalidation helper:

```ts
// app/api/revalidate/route.ts
import { createRakunRevalidateHandler } from '@rakun-kit/next/revalidate'

export const POST = createRakunRevalidateHandler({
  token: process.env.RAKUN_REVALIDATE_TOKEN!,
})
```

Then configure the same endpoint and token in Rakun bootstrap:

```ts
revalidate: {
  url: process.env.RAKUN_REVALIDATE_URL!,
  token: process.env.RAKUN_REVALIDATE_TOKEN!,
}
```

Manager mutations invalidate the affected Next path and expire the cached
static-path list, including when a page is created, moved, or deleted.

## llms.txt

Expose the manager-curated site guide with a Route Handler:

```ts
// app/llms.txt/route.ts
import { createRakunLlmsTxtRouteHandler } from '@rakun-kit/next/web'

export const dynamic = 'force-dynamic'

export const GET = createRakunLlmsTxtRouteHandler({
  apiBaseUrl: '/api/rakun',
})
```

It returns UTF-8 plain text, or 404 while llms.txt publishing is disabled. The
root file is the normal site-wide document. Sites that intentionally publish a
localized variant can use `createRakunLocaleLlmsTxtRouteHandler()` from a route
such as `app/[language]/llms.txt/route.ts`; its `paramKey` defaults to
`language`. Use an absolute `apiBaseUrl` when the API is a separate deployment.

## Web API Client

Use `@rakun-kit/next/web/client` from client components that need to call
custom Rakun operations. Keep the operation map in a separate server file, pass
it to bootstrap, and import its type in the client:

```ts
// server/api-operations.ts
import { defineOperation } from '@rakun-kit/next'
import { z } from 'zod'

export const apiOperations = {
  'demo.helloWorld': defineOperation<
    { text: string },
    { message: string },
    'query',
    'get',
    'public'
  >({
    access: 'public',
    kind: 'query',
    method: 'get',
    input: z.object({
      text: z.string().default('world'),
    }),
    output: z.object({
      message: z.string(),
    }),
    resolve: ({ input }) => ({
      message: `Hello ${input.text}`,
    }),
  }),
}
```

```ts
// app/api/rakun/[...slug]/route.ts
import { rakunNext } from '@rakun-kit/next'
import { apiOperations } from '@/server/api-operations'

export const { GET, POST, PUT } = rakunNext({
  bootstrap: {
    // ...
    apiOperations,
  },
})
```

```tsx
// modules/HelloWorld.tsx
'use client'

import { createRakunApiClient, type GetClient } from '@rakun-kit/next/web/client'
import type { apiOperations } from '@/server/api-operations'

type ApiClient = GetClient<typeof apiOperations>

const apiClient: ApiClient = createRakunApiClient<typeof apiOperations>({
  baseUrl: '/api/rakun',
})

const result = await apiClient.query('demo.helloWorld', {
  text: 'Rakun',
})
```

`query` only accepts operations declared with `kind: "query"`. `mutation` only
accepts operations declared with `kind: "mutation"`. Input and output types are
derived from each operation's Zod schemas.

## Manager Page

Render the manager from a Next App Router page with `@rakun-kit/next/manager`:

```tsx
// app/backend/[[...slug]]/page.tsx
import {
  createRakunManagerMetadata,
  RakunManagerPage,
  type RakunManagerPageProps,
} from '@rakun-kit/next/manager'

export const metadata = createRakunManagerMetadata()

export default function Page(props: RakunManagerPageProps) {
  return <RakunManagerPage {...props} apiBaseUrl="/api/rakun" basePath="/backend" />
}
```

Manager SEO belongs on the host page via framework metadata (Next
`export const metadata`, Vite `index.html`, etc.).
`createRakunManagerMetadata()` is server-safe and sets a default title,
description, and `noindex` robots.

Pass a locale pack (or just the SEO keys) to translate the copy:

```tsx
import { esManagerMessages } from '@rakun-kit/manager-locales/es'
import { createRakunManagerMetadata } from '@rakun-kit/next/manager'

export const metadata = createRakunManagerMetadata({
  messages: esManagerMessages,
})
```

Shared helpers also live at `@rakun-kit/manager-react/seo` for non-Next hosts.
Message keys: `seo.title`, `seo.description`.

`RakunManagerPage` expects Next's Promise-based `params` and `searchParams`
props.

Options:

- `apiBaseUrl`: base URL used by the manager HTTP client. Defaults to `/api`.
- `managerClient`: custom manager client. If omitted, a HTTP client is created.
- `basePath`: manager mount path. Defaults to `/backend`.
- `paramKey`: route param key used to read path segments. Defaults to `slug`.
- `loadingFallback`, `unauthenticatedFallback`: optional React fallbacks.
- `managerComponent`: client component used to mount the manager. Use it to bind
  manager plugin objects without sending them across the server/client boundary.

```tsx
// app/backend/[[...slug]]/project-manager.tsx
'use client'

import { RakunManagerClientPage } from '@rakun-kit/next/manager'
import { codeEditorManagerPlugin } from '@rakun-kit/plugin-code-editor/manager'

export const ProjectManager = (props: React.ComponentProps<typeof RakunManagerClientPage>) => (
  <RakunManagerClientPage {...props} plugins={[codeEditorManagerPlugin]} />
)

// page.tsx
<RakunManagerPage {...props} managerComponent={ProjectManager} />
```

## Local Media

Use `createLocalMediaServiceConfig` from `@rakun-kit/next/media` in bootstrap media
config:

```ts
// app/api/rakun/[...slug]/route.ts
import path from 'node:path'
import { rakunNext } from '@rakun-kit/next'
import { createLocalMediaServiceConfig } from '@rakun-kit/next/media'

export const { GET, POST, PUT } = rakunNext({
  bootstrap: {
    // ...
    media: createLocalMediaServiceConfig({
      rootDir: path.join(process.cwd(), '.rakun/media'),
      baseUrl: '/api/rakun',
      publicBaseUrl: '/api/rakun',
      tokenSecret: process.env.RAKUN_MEDIA_TOKEN_SECRET!,
      defaultAccess: 'private',
    }),
  },
})
```

When this config is detected, `rakunNext` serves:

- `PUT /api/rakun/media/local/upload/:token`
- `GET /api/rakun/media/local/private/:token`
- `GET /api/rakun/media/public/*`

## Exports

- `@rakun-kit/next`: `rakunNext`, `rakunNextCrud`, local media helpers, and shared route utilities.
- `@rakun-kit/next/trpc`: `rakunNextTrpc`.
- `@rakun-kit/next/media`: `LocalAdapter`, local media config, and local HTTP handlers.
- `@rakun-kit/next/manager`: `RakunManagerPage`, `createRakunManagerMetadata`, and manager page types.
- `@rakun-kit/next/web`: HTTP helpers, `createRakunDatabaseWeb`,
  `RakunPageRenderer`, and page path helpers.
- `@rakun-kit/next/web/client`: Rakun React renderers and typed API client helpers for client components.
- `@rakun-kit/next/revalidate`: authenticated Next cache invalidation handler.

## Build

```sh
bun run build --workspace @rakun-kit/next
```
