# @rakun/next

Next.js App Router adapter for Rakun. It provides a catch-all route handler,
optional tRPC mounting, local media handlers, and a manager page component.

## API Route Handler

Create a catch-all App Router route and export the methods returned by
`rakunNext`:

```ts
// app/api/rakun/[...slug]/route.ts
import { rakunNext } from "@rakun/next";

export const { GET, POST, PUT } = rakunNext({
  bootstrap: {
    literals,
    contentTypes: [Page, Post],
    mongo: {
      MONGO_URI: process.env.MONGO_URI!,
    },
  },
});
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
  bootstrap?: RakunBootstrapOptions;
  healthPath?: string | false;
  integrations?: RakunNextIntegration[];
};
```

Use `integrations` for extra handlers. Each integration receives the Fetch
`Request`, Next route context, and normalized path segments. The first
integration that returns a `Response` wins.

## tRPC

Mount a tRPC router in the same catch-all route with `@rakun/next/trpc`:

```ts
// app/api/rakun/[...slug]/route.ts
import { rakunNext, rakunNextCrud } from "@rakun/next";
import { rakunNextTrpc } from "@rakun/next/trpc";
import { appRouter } from "@/server/trpc";

export const { GET, POST, PUT } = rakunNext({
  bootstrap,
  integrations: [
    rakunNextCrud(),
    rakunNextTrpc({
      path: "trpc",
      router: appRouter,
    }),
  ],
});
```

The tRPC integration creates a Rakun request context from Fetch API headers,
cookies, and response headers.

## Manager Page

Render the manager from a Next App Router page with `@rakun/next/manager`:

```tsx
// app/backend/[[...slug]]/page.tsx
import {
  RakunManagerPage,
  type RakunManagerPageProps,
} from "@rakun/next/manager";

export default function Page(props: RakunManagerPageProps) {
  return (
    <RakunManagerPage
      {...props}
      apiBaseUrl="/api/rakun"
      basePath="/backend"
    />
  );
}
```

`RakunManagerPage` expects Next's Promise-based `params` and `searchParams`
props.

Options:

- `apiBaseUrl`: base URL used by the manager HTTP client. Defaults to `/api`.
- `managerClient`: custom manager client. If omitted, a HTTP client is created.
- `basePath`: manager mount path. Defaults to `/backend`.
- `paramKey`: route param key used to read path segments. Defaults to `slug`.
- `loadingFallback`, `unauthenticatedFallback`: optional React fallbacks.

## Local Media

Use `createLocalMediaServiceConfig` from `@rakun/next/media` in bootstrap media
config:

```ts
// app/api/rakun/[...slug]/route.ts
import path from "node:path";
import { rakunNext } from "@rakun/next";
import { createLocalMediaServiceConfig } from "@rakun/next/media";

export const { GET, POST, PUT } = rakunNext({
  bootstrap: {
    // ...
    media: createLocalMediaServiceConfig({
      rootDir: path.join(process.cwd(), ".rakun/media"),
      baseUrl: "/api/rakun",
      publicBaseUrl: "/api/rakun",
      tokenSecret: process.env.RAKUN_MEDIA_TOKEN_SECRET!,
      defaultAccess: "private",
    }),
  },
});
```

When this config is detected, `rakunNext` serves:

- `PUT /api/rakun/media/local/upload/:token`
- `GET /api/rakun/media/local/private/:token`
- `GET /api/rakun/media/public/*`

## Exports

- `@rakun/next`: `rakunNext`, `rakunNextCrud`, local media helpers, and shared route utilities.
- `@rakun/next/trpc`: `rakunNextTrpc`.
- `@rakun/next/media`: `LocalAdapter`, local media config, and local HTTP handlers.
- `@rakun/next/manager`: `RakunManagerPage` and manager page types.

## Build

```sh
npm run build --workspace @rakun/next
```
