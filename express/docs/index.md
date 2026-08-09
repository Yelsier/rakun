# `@rakun-kit/express` AI usage manual

Use this package to expose a bootstrapped Rakun instance through Express 5. It
provides the REST-style operation router, health endpoint, local media handlers
and optional tRPC integration. Read the core manual first at
`node_modules/@rakun-kit/core/dist/docs/index.md`.

## Install

```sh
bun add @rakun-kit/core @rakun-kit/express express
```

Add `@rakun-kit/trpc` and `@trpc/server` only when mounting tRPC.

## Canonical setup

```ts
import express from 'express'
import { rakunBootstrap } from '@rakun-kit/core'
import { rakunExpress } from '@rakun-kit/express'

rakunBootstrap({ literals, contentTypes, routes, mongo })

const app = express()
app.use('/api/rakun', rakunExpress())
```

`rakunExpress()` initializes Rakun on demand, installs `express.json()`, exposes
`GET /health`, mounts core operation routes and mounts configured media routes.
Set `healthPath: false` to disable health or `useJsonMiddleware: false` when the
host owns JSON parsing.

Use `integrations` to compose extra handlers on the same router. If listing
integrations explicitly, add `rakunExpressCrud()` to retain standard Rakun API
operations.

```ts
app.use(
  '/api/rakun',
  rakunExpress({
    integrations: [rakunExpressCrud(), rakunExpressTrpc({ path: '/trpc', router: appRouter })],
  })
)
```

## llms.txt

Mount the public file on the host application, outside the API router:

```ts
import { createRakunLlmsTxtHandler } from '@rakun-kit/express'

app.get('/llms.txt', createRakunLlmsTxtHandler())
```

The handler initializes core, reads `LlmsSettings`, returns UTF-8 plain text,
and responds with 404 when publishing is disabled or no title can be resolved.
Use `createRakunLlmsTxtHandler({ language })` for a fixed locale, or
`resolveLanguage(request)` for a route such as `/:language/llms.txt`.

Import `rakunExpressTrpc` from `@rakun-kit/express/trpc`. It maps Express
headers, cookies and response state into the Rakun/tRPC context.

## Local media

Import `createLocalMediaServiceConfig` from `@rakun-kit/express/media` and pass
its result to core bootstrap. Keep `rootDir` outside public static directories
when private files are enabled, use a strong `tokenSecret`, and make `baseUrl`
match the Express mount path.

```ts
import path from 'node:path'
import { createLocalMediaServiceConfig } from '@rakun-kit/express/media'

const media = createLocalMediaServiceConfig({
  rootDir: path.join(process.cwd(), '.rakun/media'),
  baseUrl: '/api/rakun',
  publicBaseUrl: '/api/rakun',
  tokenSecret: process.env.RAKUN_MEDIA_TOKEN_SECRET!,
  defaultAccess: 'private',
})
```

## Public entrypoints and constraints

- `@rakun-kit/express`: `rakunExpress`, `rakunExpressCrud`, integration and
  shared local-service helpers.
- `@rakun-kit/express/trpc`: optional tRPC integration.
- `@rakun-kit/express/media`: local media adapter, config and HTTP handlers.

Do not import this package from browser code. Let Rakun's operation wrapper and
adapter error handling record API failures; do not swallow errors in custom
integrations. Configure a narrow CSP `frame-ancestors` directive when the
manager or preview is embedded across known origins.
