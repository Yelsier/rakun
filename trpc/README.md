# @rakun-kit/trpc

tRPC router package for Rakun manager and web operations.

## Router

Create a router from Rakun's current operation definitions:

```ts
import { createRakunTrpcRouter } from "@rakun-kit/trpc";

export const appRouter = createRakunTrpcRouter();
export type AppRouter = typeof appRouter;
```

The package also exports a ready-made router:

```ts
import { appRouter, type AppRouter } from "@rakun-kit/trpc";
```

`createRakunTrpcRouter()` combines manager and web operation routers. Operation
names become nested tRPC paths, so `manager.auth.login` becomes
`manager.auth.login`.

## Context

`createTrpcContext` is Rakun's `createRequestContext`:

```ts
import { createTrpcContext, parseCookieHeader } from "@rakun-kit/trpc";

const ctx = await createTrpcContext({
  headers,
  cookies: parseCookieHeader(cookieHeader),
  res,
});
```

Adapters in `@rakun-kit/express/trpc` and `@rakun-kit/next/trpc` already create this
context for you.

## Errors

Rakun application errors are mapped to tRPC errors and included in formatted
error data as `appError`. Use `logRakunTrpcError` in adapters to log forbidden
and internal server errors consistently.

## Exports

- `createRakunTrpcRouter`
- `appRouter`
- `AppRouter`
- `createTrpcContext`
- `logRakunTrpcError`
- `parseCookieHeader`
- `routerInfo`

## Build

```sh
bun run build --workspace @rakun-kit/trpc
```
