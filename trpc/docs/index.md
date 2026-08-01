# `@rakun-kit/trpc` AI usage manual

Use this package when a Rakun host needs a tRPC router in addition to or instead
of its HTTP operation transport. Read the core manual first at
`node_modules/@rakun-kit/core/dist/docs/index.md`, then the selected framework
adapter manual.

## Install and create the router

```sh
bun add @rakun-kit/trpc @trpc/server
```

```ts
import { createRakunTrpcRouter } from '@rakun-kit/trpc'

export const appRouter = createRakunTrpcRouter()
export type AppRouter = typeof appRouter
```

The package also exports a ready-made `appRouter` and `AppRouter`. Prefer
`createRakunTrpcRouter()` when initialization order or application typing makes
an explicit router clearer. Rakun operation names become the corresponding
nested tRPC paths.

## Mounting

- Express: use `rakunExpressTrpc` from `@rakun-kit/express/trpc`.
- Next.js: use `rakunNextTrpc` from `@rakun-kit/next/trpc`.

Those adapters create the request context. For a custom host, use
`createTrpcContext({ headers, cookies, res })` and `parseCookieHeader` as needed.

Rakun application errors are mapped to tRPC errors and exposed as `appError` in
formatted error data. Preserve this shape in clients. Use
`logRakunTrpcError` at custom adapter boundaries for the same diagnostic logging
as the official adapters. Preserve core's operation wrapper so API failures
also reach the persistent event log exactly once; never persist raw internal
errors or request payloads.

## Public API and constraints

The only public entrypoint is `@rakun-kit/trpc`. It exports
`createRakunTrpcRouter`, `appRouter`, `AppRouter`, `createTrpcContext`,
`logRakunTrpcError`, `parseCookieHeader` and `routerInfo`.

This is a server package. Do not bundle the router into browser code; clients
should import its type only. Register custom operations in core bootstrap before
creating or serving the router.
