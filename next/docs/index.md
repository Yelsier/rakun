# `@rakun-kit/next` AI usage manual

Use this package for Rakun in a Next.js App Router application. It covers API
route handlers, optional tRPC, local media, manager pages, server-rendered web
pages and a typed client API. Read the core manual first at
`node_modules/@rakun-kit/core/dist/docs/index.md` and also obey the installed
Next.js documentation for the exact Next version.

## Install

```sh
bun add @rakun-kit/core @rakun-kit/next @rakun-kit/react next react react-dom
```

Add `@rakun-kit/manager-react` for the manager and `@rakun-kit/trpc` plus
`@trpc/server` for tRPC.

## API route

Create a catch-all App Router route:

```ts
// app/api/rakun/[...slug]/route.ts
import { rakunNext } from '@rakun-kit/next'

export const { GET, POST, PUT } = rakunNext({
  bootstrap: { literals, contentTypes, routes, apiOperations, mongo },
})
```

The handler bootstraps and initializes Rakun, serves `GET /api/rakun/health`,
mounts core operations and mounts configured media routes. Set
`healthPath: false` to disable health.

`integrations` are evaluated in order; the first `Response` wins. When listing
them explicitly, include `rakunNextCrud()` to retain standard Rakun operations.
Mount tRPC with `rakunNextTrpc({ path: 'trpc', router })` from
`@rakun-kit/next/trpc`.

Keep bootstrap and operation values in server-only modules. A client may import
their types with `import type`, but must not import a module that executes
bootstrap or reads secrets.

Use `createNextPlatform()` when the application wants explicit framework and
deployment defaults. Next defaults to `serverless` and polling because a
persistent connection cannot be inferred from the runtime:

```ts
import { createNextPlatform } from '@rakun-kit/next'

const bootstrap = {
  literals,
  contentTypes,
  mongo,
  platform: createNextPlatform(),
}
```

Pass `deployment: 'persistent'` when true. Next then selects SSE at the relative
`realtime/events` endpoint, served automatically by `rakunNext`; the manager
resolves it against its `apiBaseUrl`. Both Node.js and Bun can stream this Route
Handler. Set `realtimePath: false` to disable it or pass another path to both
the platform provider and `rakunNext` when mounting it elsewhere.

WebSockets require a server that owns the HTTP upgrade, which a Next Route
Handler does not expose. A persistent Node custom server can configure
`websocketRealtime({ endpoint: 'realtime/ws' })` and call
`attachRakunNodeWebSocketServer({ server })` from
`@rakun-kit/next/realtime/node`. A Bun-owned HTTP server can pass
`createRakunBunWebSocketServerOptions()` from `@rakun-kit/next/realtime/bun` to
`Bun.serve`. These bridges validate
the manager session and forward platform topic invalidations. Standard Next on
Bun still selects SSE: runtime detection affects native image processing, while
the framework server controls whether WebSocket upgrade is available.
Install the optional `ws` peer when using the Node bridge.

## Manager route

```tsx
// app/backend/[[...slug]]/page.tsx
import { RakunManagerPage, type RakunManagerPageProps } from '@rakun-kit/next/manager'

export default function Page(props: RakunManagerPageProps) {
  return <RakunManagerPage {...props} apiBaseUrl="/api/rakun" basePath="/backend" />
}
```

`RakunManagerPage` accepts the Promise-based App Router `params` and
`searchParams`. For manager plugins, make a separate `'use client'` wrapper
around `RakunManagerClientPage`, register plugin objects there, and pass that
wrapper as `managerComponent`. Do not pass plugin objects across the
server/client serialization boundary.

## Web page route

When the Rakun API and the website live in the same Next.js application, create
a database-backed web helper from the same bootstrap used by `rakunNext`:

```ts
// server/web.ts
import { createRakunDatabaseWeb } from '@rakun-kit/next/web'
import { createRakunBootstrap } from './bootstrap'

export const rakunWeb = createRakunDatabaseWeb({
  bootstrap: createRakunBootstrap,
})
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

Module files export `default` or `component`. They are server components by
default; put `'use client'` in only the modules that need browser APIs or hooks.
`RakunPageRenderer` handles the built-in `StructuredData` JSON-LD module
natively, before calling `loadModule`, so no `modules/StructuredData.tsx` file is
needed. It also keeps the page response's top-level `literals` separate from
`info` while making them available to `useT`. Add that content type to an
iterator or shared Template and use dynamic data mappings when all documents of
a type share the same schema shape.

Preview and development inspection are automatic. In those modes only,
`RakunPageRenderer` adds a wrapper-free React boundary and a client-side
instrumenter locates each module's outermost DOM element after hydration. It
attaches the `data-rakun-*` attributes there and observes later DOM changes.
Modules do not accept or forward instrumentation props. Normal production pages
do not render the boundary or load the instrumenter. Both inspectors use a
single global overlay that moves over the attributed root.

`createRakunDatabaseWeb` initializes core and reads pages and static paths from
MongoDB. It uses Next's data cache for static routes and the same cache tag as
the revalidation handler, but stays uncached in development and for dynamic or
preview pages. For an optional catch-all, the root path is emitted as
`{ slug: [] }`, which keeps every generated param valid in Next.js. The helper
is server-only and must not be imported by client components.

On normal pages, `RakunPageRenderer` enables a development toolbar when
`NODE_ENV` is `development`. It shows route/document metadata, links to the
manager edit screen, lists content/template/layout modules, highlights modules
on hover or page selection, and exposes the props received by the selected
module. Its options are ignored in production, where no instrumentation is
mounted. Preview pages retain their separate manager inspector and omit this
toolbar.

The props pane uses the shared collapsible `JsonViewer` also used by the API
Routes output. Its first level starts expanded, nested objects and arrays remain
closed, and each collection can be expanded independently.

The minimized state is a small floating Rakun logo instead of a full-width
bar. The expanded toolbar also has a **Hide** action that removes it for the
current page view; reloading or navigating restores it.

The edit link assumes the manager is mounted at `/backend`. Pass
`devToolbar={{ managerBasePath: '/manager', initialOpen: true }}` to configure
it, `devToolbar={false}` to disable it in development, or `devToolbar={true}` to
enable it explicitly in another environment. Do not enable it on public
production pages because inspected module props may contain debugging context.

When the API is a separate deployment, use `createRakunGenerateStaticParams`,
`getRakunPage`, and `getRakunPageFromProps` with an absolute `apiBaseUrl`.
That API must be reachable during `next build`; Next does not serve the current
application's Route Handlers while building.

In production, the HTTP helpers use `web.staticPaths` to identify
`dynamic: false` routes, cache their page query with the returned TTL, and keep
dynamic routes and previews on `no-store`. Development remains uncached.
Explicit `fetchOptions.cache` or `fetchOptions.next.revalidate` overrides
automatic selection; set `autoCache: false` to disable it.

Pass unresolved page props to `getRakunPageFromProps`: it reads `searchParams`
only for dynamic routes because Next treats that prop as request-time data.
Mount manager previews on a separate dynamic route.

Preview pages rendered with `RakunPageRenderer` install the Rakun preview
bridge automatically. Besides live snapshot updates and module selection, the
bridge can return a sanitized on-page SEO snapshot to the manager. It combines
the resolved Rakun SEO metadata with headings and images from the rendered DOM,
validates every rendered JSON-LD block and reports its discovered schema types,
and removes the preview token from the reported URL. Protective metadata added
by the host preview route, such as `noindex`, is not reported as page metadata;
the indexability check reflects the routed content's resolved `noIndex` value.
No additional application component or public API call is required.

## llms.txt

Expose the optional site-wide guide through an App Router Route Handler:

```ts
// app/llms.txt/route.ts
import { createRakunLlmsTxtRouteHandler } from '@rakun-kit/next/web'

export const dynamic = 'force-dynamic'
export const GET = createRakunLlmsTxtRouteHandler({ apiBaseUrl: '/api/rakun' })
```

The handler fetches the public `web.llms` operation with `cache: 'no-store'`,
returns UTF-8 plain text, and returns 404 while publishing is disabled. Keep one
root `/llms.txt` for the normal site-wide document. If the host deliberately
publishes localized variants, use `createRakunLocaleLlmsTxtRouteHandler()` in
`app/[language]/llms.txt/route.ts`; `paramKey` defaults to `language`.

Expose the authenticated revalidation handler:

```ts
// app/api/revalidate/route.ts
import { createRakunRevalidateHandler } from '@rakun-kit/next/revalidate'

export const POST = createRakunRevalidateHandler({
  token: process.env.RAKUN_REVALIDATE_TOKEN!,
})
```

Configure core with the same token and the handler's absolute URL:

```ts
revalidate: {
  url: process.env.RAKUN_REVALIDATE_URL!,
  token: process.env.RAKUN_REVALIDATE_TOKEN!,
}
```

The handler immediately expires the cached static-path list and calls Next's
`revalidatePath()` for the changed URL. Saving, moving, publishing, or deleting
a routed document therefore refreshes it on the next visit.

Use `createRakunPageModuleLoader` to merge web plugin registries with an
application fallback. Keep the dynamic fallback import in application code so
Next can discover its bundle boundary.

## Typed client operations

From a client component, import `createRakunApiClient` and `GetClient` from
`@rakun-kit/next/web/client`. Import the server operation map as a type only.
Call `.query(...)` for query operations and `.mutation(...)` for mutations; the
input/output types come from their Zod contracts.

## Local media

Use `createLocalMediaServiceConfig` from `@rakun-kit/next/media` in bootstrap.
Set `baseUrl` and `publicBaseUrl` to the catch-all API base, keep private files
outside public directories, and provide a strong `tokenSecret`.

## Public entrypoints and constraints

- `@rakun-kit/next`: API route and integration utilities.
- `/trpc`, `/media`, `/manager`, `/web`, `/web/client`, and `/revalidate` for
  the features above.
- `/realtime/node` and `/realtime/bun` for persistent WebSocket server bridges.
- `/web` also exports `createRakunDatabaseWeb` for monolithic Next applications.
- `/translation`, `/dev`, `/internal-content-types` for their focused public
  helpers; import only when the application specifically needs them.

Do not deep-import from `dist`. Do not import manager/browser code in the API
route. Configure a narrow CSP `frame-ancestors` directive for known manager or
preview origins. Redirect responses from Rakun are handled by the web renderer;
do not render their page modules first.
