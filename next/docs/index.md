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
  createRakunPageMetadata,
  getRakunPage,
  getRakunPathFromParams,
  RakunPageRenderer,
} from '@rakun-kit/next/web'

export async function generateMetadata({ params, searchParams }) {
  const page = await getRakunPage({
    path: getRakunPathFromParams({ params: await params }),
    search: await searchParams,
    apiBaseUrl: '/api/rakun',
  })
  return createRakunPageMetadata(page)
}

export default async function Page({ params, searchParams }) {
  const page = await getRakunPage({
    path: getRakunPathFromParams({ params: await params }),
    search: await searchParams,
    apiBaseUrl: '/api/rakun',
  })
  return <RakunPageRenderer page={page} loadModule={(name) => import(`@/modules/${name}`)} />
}
```

Module files export `default` or `component`. They are server components by
default; put `'use client'` in only the modules that need browser APIs or hooks.
`getRakunPage` forwards request headers and defaults to `cache: 'no-store'`.
Pass `fetchOptions` explicitly for ISR or caching.

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
- `/trpc`, `/media`, `/manager`, `/web`, `/web/client` for the features above.
- `/translation`, `/dev`, `/internal-content-types` for their focused public
  helpers; import only when the application specifically needs them.

Do not deep-import from `dist`. Do not import manager/browser code in the API
route. Configure a narrow CSP `frame-ancestors` directive for known manager or
preview origins. Redirect responses from Rakun are handled by the web renderer;
do not render their page modules first.
