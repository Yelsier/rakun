# @rakun-kit/bun

Bun 1.4 framework adapter for Rakun. It runs Rakun API, manager, web rendering,
static routes, dynamic routes, and development reloads from one `Bun.serve()`
process.

## Install

```sh
bun add @rakun-kit/bun @rakun-kit/core @rakun-kit/manager-react @rakun-kit/react react react-dom
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

Create a typed `rakun.config.ts`. `bootstrap` accepts the same
`RakunBootstrapOptions` used by the other Rakun adapters; the remaining fields
configure the Bun framework:

```ts
import type { RakunBunConfig } from '@rakun-kit/bun'
import { createRakunBootstrap } from './src/rakun/bootstrap'

const bunConfig: RakunBunConfig = {
  bootstrap: createRakunBootstrap,
  modulesDir: './src/modules',
  revalidation: {
    token: process.env.RAKUN_REVALIDATE_TOKEN!,
  },
}

export default bunConfig
```

The default paths are `/api`, `/manager`, `/_rakun/rsc`, `/_rakun/revalidate`,
and `/assets`. `revalidation` configures core to call the same Bun process after
Rakun resolves affected content to paths.

The manager preview is enabled for the same Bun origin by default. Set
`manager: { preview: false }` to disable it, or provide `webBaseUrl` and
`tokenParam` when the web application is hosted elsewhere or uses a custom
preview query parameter. Preview requests with that token are resolved through
Rakun's `web.previewPage` operation.

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

An unresolved route uses the framework's empty `NotFound` fallback and returns
HTTP 404. Add `src/modules/NotFound.tsx` to render an application-specific 404
module; Bun keeps the response status and marker automatically.

Rakun page content stays separate from this code. A content save regenerates
only the HTML and path-scoped render payload; source changes rebuild code and
hashed assets.

## Rendering and navigation

`web.staticPaths` is the source of truth for build-time routes. Each static path
gets HTML plus a `flight.rsc` render payload. Other paths resolve through
`web.page` at request time. Client navigation requests `/_rakun/rsc/*`, swaps
the rendered tree, and imports only client chunks referenced by the destination
page.

Add `src/document.tsx` to define the application shell. It is a server component
and follows the same `children` layout shape as a Next.js root layout:

```tsx
import type { RakunBunDocumentProps } from '@rakun-kit/bun'

import './globals.css'

export default function Document({ children, page }: RakunBunDocumentProps) {
  return (
    <html lang={page.language?.code ?? 'en'}>
      <head>
        <link rel="icon" href="/favicon.svg" />
      </head>
      <body>
        <div className="site">{children}</div>
      </body>
    </html>
  )
}
```

The framework bundles global CSS imported by the document and injects page SEO,
styles, navigation scripts, and the Rakun root inside the rendered document. The
file must export a default server component.

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

`rakun-bun dev` watches `src` and an external module directory when configured.
It rebuilds the document and server graph for server-only changes, rebuilds only
the affected client entries when a client module changes, invalidates static
routes for lazy regeneration, and replaces the rendered tree over the
development WebSocket. A failed rebuild leaves the current application active;
a browser-side update failure falls back to a page reload.

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

- `RakunBunConfig`, `RakunBunDocumentProps`, `loadRakunConfig()`, and
  `resolveRakunConfig()`
- `createRakunBun()` and `startRakunBun()`
- `RakunBunApplication.build()`, `.fetch()`, `.serve()`, `.invalidatePath()`,
  and `.stop()`
- `discoverRakunModules()`
- `createBunPlatform()`
- `RakunRouteCache`

The `web` config hook can replace direct core reads for a remote or test data
source. Normal monolithic applications should use `bootstrap` and let the
adapter call core directly.
