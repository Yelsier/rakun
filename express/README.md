# @rakun-kit/express

Express adapter for Rakun. It mounts Rakun API operations, health checks, media
upload routes, optional local media, and optional tRPC.

## Router

Call `rakunBootstrap` once in your app, then mount `rakunExpress()`:

```ts
import express from 'express'
import { rakunBootstrap } from '@rakun-kit/core'
import { rakunExpress } from '@rakun-kit/express'

rakunBootstrap({
  literals,
  contentTypes: [Page, Post],
  mongo: {
    MONGO_URI: process.env.MONGO_URI!,
  },
})

const app = express()

app.use('/api/rakun', rakunExpress())
```

By default, the router:

- calls `ensureRakunInitialized()` before handling requests.
- serves `GET /health`.
- installs `express.json()`.
- serves Rakun operation routes through `rakunExpressCrud()`.
- serves media upload routes when media is configured.
- serves the authenticated SSE endpoint when the core platform configures SSE.

Options:

```ts
type RakunExpressOptions = {
  healthPath?: string | false
  integrations?: RakunExpressIntegration[]
  realtime?: false | RakunExpressRealtimeOptions
  useJsonMiddleware?: boolean
}
```

Use `integrations` to mount extra handlers on the same router:

```ts
app.use(
  '/api/rakun',
  rakunExpress({
    integrations: [
      (router) => {
        router.get('/custom', (_req, res) => {
          res.json({ ok: true })
        })
      },
    ],
  })
)
```

## Runtime Platform

`createExpressPlatform()` detects Node.js or Bun, records the Express framework,
and defaults to a persistent deployment. Polling remains the realtime default.

```ts
import { createExpressPlatform } from '@rakun-kit/express'

rakunBootstrap({ ...options, platform: createExpressPlatform() })
```

Configure SSE in the same core platform. `sseRealtime()` defaults to
`/realtime` relative to the Express API mount, and `rakunExpress()` serves it
automatically with authentication, topic multiplexing, and heartbeats:

```ts
import { sseRealtime } from '@rakun-kit/core'
import { createExpressPlatform, rakunExpress } from '@rakun-kit/express'

rakunBootstrap({
  ...options,
  platform: createExpressPlatform({
    realtime: sseRealtime(),
  }),
})

app.use('/api/rakun', rakunExpress())
```

Collaboration presence bindings on that stream are authorized for their
document or Template room. Heartbeats renew them and disconnecting the last
stream for a browser tab removes them, avoiding periodic presence-only sync
requests from the manager.

Set `realtime: false` on `rakunExpress()` only when another host component
owns the configured SSE endpoint.

## llms.txt

Mount the public file at the site root, separately from the Rakun API router:

```ts
import { createRakunLlmsTxtHandler } from '@rakun-kit/express'

app.get('/llms.txt', createRakunLlmsTxtHandler())
```

The handler reads the manager configuration directly from core, returns
`text/plain; charset=utf-8`, and responds with 404 until publishing is enabled
and a title is available. For a localized route, pass `language` or derive it
from the request:

```ts
app.get(
  '/:language/llms.txt',
  createRakunLlmsTxtHandler({
    resolveLanguage: (request) => request.params.language,
  })
)
```

## tRPC

Mount tRPC with `@rakun-kit/express/trpc`:

```ts
import { rakunExpress, rakunExpressCrud } from '@rakun-kit/express'
import { rakunExpressTrpc } from '@rakun-kit/express/trpc'
import { appRouter } from '@/server/trpc'

app.use(
  '/api/rakun',
  rakunExpress({
    integrations: [
      rakunExpressCrud(),
      rakunExpressTrpc({
        path: '/trpc',
        router: appRouter,
      }),
    ],
  })
)
```

The tRPC integration creates a Rakun request context from Express headers,
cookies, and response.

## Security Headers

When serving the manager and preview on known origins, configure your reverse
proxy or Express app to send a `Content-Security-Policy` with a narrow
`frame-ancestors` directive, for example:

```txt
Content-Security-Policy: frame-ancestors 'self' https://manager.example.com
```

## Local Media

Use `createLocalMediaServiceConfig` from `@rakun-kit/express/media` in bootstrap
media config:

```ts
import path from 'node:path'
import { createLocalMediaServiceConfig } from '@rakun-kit/express/media'

rakunBootstrap({
  // ...
  media: createLocalMediaServiceConfig({
    rootDir: path.join(process.cwd(), '.rakun/media'),
    baseUrl: '/api/rakun',
    publicBaseUrl: '/api/rakun',
    tokenSecret: process.env.RAKUN_MEDIA_TOKEN_SECRET!,
    defaultAccess: 'private',
  }),
})
```

When this config is detected, `rakunExpress` serves:

- `PUT /media/local/upload/:token`
- `GET /media/local/private/:token`
- `GET /media/public/*`

## Exports

- `@rakun-kit/express`: `rakunExpress`, `rakunExpressCrud`, `rakunExpressRealtime`, `rakunExpressLocalService`, local media helpers.
- `@rakun-kit/express/trpc`: `rakunExpressTrpc`.
- `@rakun-kit/express/media`: `LocalAdapter`, local media config, and local HTTP handlers.

## Build

```sh
bun run build --workspace @rakun-kit/express
```
