# `@rakun-kit/bun` AI usage manual

Use this package when a Rakun application runs API, manager, and web rendering
in one persistent Bun 1.4 process. Read the core manual first.

## Setup

Install `@rakun-kit/bun`, `@rakun-kit/core`, `react`, and `react-dom`. Create a
default-exported `rakun.config.ts` with `defineRakunConfig()` and scripts for
`rakun-bun dev`, `rakun-bun build`, and `rakun-bun start`.

```ts
import { defineRakunConfig } from '@rakun-kit/bun'
import { createRakunBootstrap } from './src/rakun/bootstrap'

export default defineRakunConfig({
  bootstrap: createRakunBootstrap,
  modulesDir: './src/modules',
  revalidation: { token: process.env.RAKUN_REVALIDATE_TOKEN! },
})
```

Defaults: API `/api`, manager `/manager`, modules `src/modules`, output `dist`,
port `3000`, RSC transport `/_rakun/rsc`, assets `/assets`, and path
revalidation `/_rakun/revalidate`.

## Module rules

Create `src/modules/Name.tsx` or `src/modules/Name/index.tsx`. Do not create or
maintain a registry. Module names come from the file or containing directory;
duplicates fail. Export a default component or named `component`.

Modules without `'use client'` render only on the server. Put the directive at
the top of modules needing hooks or browser APIs. The build emits one entry
chunk per client boundary plus shared chunks. Content props do not participate
in chunk identity.

## Routes and cache

Core `web.staticPaths` drives static generation; core `web.page` resolves page
modules and props. Unknown/dynamic paths render at request time. Static paths
persist immutable generations containing `index.html`, `flight.rsc`, and route
metadata.

Call only `invalidatePath(path)` at the framework boundary. Core calculates
which paths are affected. Regeneration finishes and persists a new generation
before the live in-memory pointer changes. Do not add content relationships,
module invalidation, tags, or `invalidateTag` to this package.

## Manager and API

The manager is bundled from `@rakun-kit/manager-react` and mounted at
`/manager` unless disabled with `manager: false`. It uses the configured API
base path. The API handler exposes core operation definitions, preserves auth
cookies and origin checks, records all operation errors through core, serves
the configured binary media upload operation, and exposes core SSE realtime.

## Custom shell

Use `document({ body, page, path, assets })` for the application shell. Return
`{ head, body, htmlAttributes, bodyAttributes }`. Keep user-facing content in
Rakun literals; the shell should not hardcode content copy.

## Constraints

- Bun `>=1.4.0`, React `>=19`, ESM only.
- Filesystem page routing and Server Actions are unsupported.
- Navigation uses Rakun's path-scoped `text/x-component` render payload; client
  boundaries hydrate as isolated React roots.
- Development module changes trigger graph rebuild, static regeneration, and a
  rendered-tree hot update over WebSocket; failures fall back to reload.
- No `invalidateTag` support.
