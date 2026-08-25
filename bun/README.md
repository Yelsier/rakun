# @rakun-kit/bun

Bun 1.4 framework adapter for Rakun. It runs Rakun API, manager, web rendering,
static routes, dynamic routes, and development reloads from one `Bun.serve()`
process.

## Install

```sh
bun add @rakun-kit/bun @rakun-kit/core react react-dom
```

Add scripts to the application:

```json
{
  "scripts": {
    "dev": "rakun-bun dev",
    "build": "rakun-bun build",
    "start": "rakun-bun start"
  }
}
```

Create `rakun.config.ts`:

```ts
import { defineRakunConfig } from '@rakun-kit/bun'
import { createRakunBootstrap } from './src/rakun/bootstrap'

export default defineRakunConfig({
  bootstrap: createRakunBootstrap,
  modulesDir: './src/modules',
  revalidation: {
    token: process.env.RAKUN_REVALIDATE_TOKEN!,
  },
})
```

The default paths are `/api`, `/manager`, `/_rakun/rsc`, `/_rakun/revalidate`,
and `/assets`. `revalidation` configures core to call the same Bun process after
Rakun resolves affected content to paths.

## Filesystem modules

Both forms are discovered without an index registry:

```text
src/modules/Hero.tsx
src/modules/Gallery/index.tsx
```

The resulting names are `Hero` and `Gallery`. Duplicate names fail the build.
Modules are server-rendered by default and their code is absent from browser
bundles. A top-level `'use client'` directive creates a browser chunk and a
hydrated island:

```tsx
'use client'

import { useState } from 'react'

export default function Counter({ initial = 0 }) {
  const [value, setValue] = useState(initial)
  return <button onClick={() => setValue(value + 1)}>{value}</button>
}
```

Rakun page content stays separate from this code. A content save regenerates
only the HTML and path-scoped render payload; source changes rebuild code and
hashed assets.

## Rendering and navigation

`web.staticPaths` is the source of truth for build-time routes. Each static path
gets HTML plus a `flight.rsc` render payload. Other paths resolve through
`web.page` at request time. Client navigation requests `/_rakun/rsc/*`, swaps
the rendered tree, and imports only client chunks referenced by the destination
page.

Use `document` to add application shell markup:

```tsx
export default defineRakunConfig({
  bootstrap: createRakunBootstrap,
  document: ({ body }) => ({
    head: <link rel="icon" href="/favicon.svg" />,
    body: <div className="site">{body}</div>,
    htmlAttributes: { lang: 'en' },
  }),
})
```

## Path invalidation

The public primitive is `invalidatePath(path)`. Static regeneration renders a
new generation separately, writes complete HTML and render payload files, then
swaps the in-memory route pointer. Failed rendering leaves the previous version
available.

```ts
const app = createRakunBun(config)
await app.invalidatePath('/about')
```

The authenticated HTTP endpoint accepts the existing core revalidation shape:

```http
POST /_rakun/revalidate
Authorization: Bearer <token>
Content-Type: application/json

{"path":"/about"}
```

`invalidateTag` is intentionally not implemented. Rakun remains responsible for
content relationships and calculating affected paths.

## Development and production

`rakun-bun dev` watches the module directory, rebuilds generated registries and
server/client graphs, regenerates static pages, and replaces the rendered tree
over the development WebSocket. A failed hot update falls back to a page reload.

`rakun-bun build` writes:

```text
dist/
  server.js
  assets/
  routes/
  manifests/
    build.json
    client.json
    modules.json
    routes.json
```

Run the production output with `rakun-bun start` or `bun dist/server.js`.

## Public API

- `defineRakunConfig()` and `loadRakunConfig()`
- `createRakunBun()` and `startRakunBun()`
- `RakunBunApplication.build()`, `.fetch()`, `.serve()`, `.invalidatePath()`,
  and `.stop()`
- `discoverRakunModules()`
- `createBunPlatform()`
- `RakunRouteCache`

The `web` config hook can replace direct core reads for a remote or test data
source. Normal monolithic applications should use `bootstrap` and let the
adapter call core directly.
