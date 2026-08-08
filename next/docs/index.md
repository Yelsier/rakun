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

```tsx
// app/[[...slug]]/page.tsx
import {
  createRakunGenerateStaticParams,
  createRakunPageMetadata,
  getRakunPageFromProps,
  RakunPageRenderer,
  type RakunNextPageProps,
} from '@rakun-kit/next/web'

const apiBaseUrl = process.env.RAKUN_API_URL!

export const generateStaticParams = createRakunGenerateStaticParams({
  apiBaseUrl,
})

export async function generateMetadata(props: RakunNextPageProps) {
  const page = await getRakunPageFromProps(props, { apiBaseUrl })
  return createRakunPageMetadata(page)
}

export default async function Page(props: RakunNextPageProps) {
  const page = await getRakunPageFromProps(props, { apiBaseUrl })
  return <RakunPageRenderer page={page} loadModule={(name) => import(`@/modules/${name}`)} />
}
```

Module files export `default` or `component`. They are server components by
default; put `'use client'` in only the modules that need browser APIs or hooks.
`createRakunGenerateStaticParams` calls the public `web.staticPaths` endpoint
and converts its paths for a catch-all segment. `apiBaseUrl` must be absolute:
the API must already be reachable while `next build` runs because Next does not
serve the application's own Route Handlers during a build.

In production, `getRakunPage` and `getRakunPageFromProps` use the same endpoint to identify
`dynamic: false` routes, caches their page query with the returned TTL, and
keeps dynamic routes and previews on `no-store`. Development remains
uncached. Explicit `fetchOptions.cache` or `fetchOptions.next.revalidate`
overrides automatic selection; set `autoCache: false` to disable it.

Pass unresolved page props to `getRakunPageFromProps`: it reads `searchParams`
only for dynamic routes because Next treats that prop as request-time data.
Mount manager previews on a separate dynamic route.

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
- `/translation`, `/dev`, `/internal-content-types` for their focused public
  helpers; import only when the application specifically needs them.

Do not deep-import from `dist`. Do not import manager/browser code in the API
route. Configure a narrow CSP `frame-ancestors` directive for known manager or
preview origins. Redirect responses from Rakun are handled by the web renderer;
do not render their page modules first.
