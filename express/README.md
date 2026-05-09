# @rakun-kit/express

Express adapter for Rakun. It mounts Rakun API operations, health checks, media
upload routes, optional local media, and optional tRPC.

## Router

Call `rakunBootstrap` once in your app, then mount `rakunExpress()`:

```ts
import express from "express";
import { rakunBootstrap } from "@rakun-kit/core";
import { rakunExpress } from "@rakun-kit/express";

rakunBootstrap({
  literals,
  contentTypes: [Page, Post],
  mongo: {
    MONGO_URI: process.env.MONGO_URI!,
  },
});

const app = express();

app.use("/api/rakun", rakunExpress());
```

By default, the router:

- calls `ensureRakunInitialized()` before handling requests.
- serves `GET /health`.
- installs `express.json()`.
- serves Rakun operation routes through `rakunExpressCrud()`.
- serves media upload routes when media is configured.

Options:

```ts
type RakunExpressOptions = {
  healthPath?: string | false;
  integrations?: RakunExpressIntegration[];
  useJsonMiddleware?: boolean;
};
```

Use `integrations` to mount extra handlers on the same router:

```ts
app.use(
  "/api/rakun",
  rakunExpress({
    integrations: [
      (router) => {
        router.get("/custom", (_req, res) => {
          res.json({ ok: true });
        });
      },
    ],
  }),
);
```

## tRPC

Mount tRPC with `@rakun-kit/express/trpc`:

```ts
import { rakunExpress, rakunExpressCrud } from "@rakun-kit/express";
import { rakunExpressTrpc } from "@rakun-kit/express/trpc";
import { appRouter } from "@/server/trpc";

app.use(
  "/api/rakun",
  rakunExpress({
    integrations: [
      rakunExpressCrud(),
      rakunExpressTrpc({
        path: "/trpc",
        router: appRouter,
      }),
    ],
  }),
);
```

The tRPC integration creates a Rakun request context from Express headers,
cookies, and response.

## Local Media

Use `createLocalMediaServiceConfig` from `@rakun-kit/express/media` in bootstrap
media config:

```ts
import path from "node:path";
import { createLocalMediaServiceConfig } from "@rakun-kit/express/media";

rakunBootstrap({
  // ...
  media: createLocalMediaServiceConfig({
    rootDir: path.join(process.cwd(), ".rakun/media"),
    baseUrl: "/api/rakun",
    publicBaseUrl: "/api/rakun",
    tokenSecret: process.env.RAKUN_MEDIA_TOKEN_SECRET!,
    defaultAccess: "private",
  }),
});
```

When this config is detected, `rakunExpress` serves:

- `PUT /media/local/upload/:token`
- `GET /media/local/private/:token`
- `GET /media/public/*`

## Exports

- `@rakun-kit/express`: `rakunExpress`, `rakunExpressCrud`, `rakunExpressLocalService`, local media helpers.
- `@rakun-kit/express/trpc`: `rakunExpressTrpc`.
- `@rakun-kit/express/media`: `LocalAdapter`, local media config, and local HTTP handlers.

## Build

```sh
bun run build --workspace @rakun-kit/express
```
