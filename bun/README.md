# @rakun-kit/bun

Bun 1.4 framework adapter for Rakun. It runs Rakun API, manager, web rendering,
static routes, dynamic routes, and development reloads from one `Bun.serve()`
process.

## Install

```sh
bun add @rakun-kit/bun @rakun-kit/core @rakun-kit/manager-react @rakun-kit/react react react-dom
```

Bun uses its native password implementation, so this adapter does not require
the `bcrypt` package.

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
bundles. A top-level `'use client'` directive creates a self-contained browser
bundle and a hydrated island:

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
the rendered tree, and imports only client bundles referenced by the
destination page. Web module bundles, navigation, and the manager are built as
independent graphs, so a public page never downloads manager code or incidental
shared chunks. The manager keeps its own lazy-loaded graph under
`/assets/manager/`; route chunks produced by `React.lazy` load only after that
manager route is visited. Production builds consolidate the manager shell into
one initial script, emit one lazy root bundle per built-in manager screen, and
retain only genuinely shared supporting chunks. Lucide's runtime registry is
also reduced to the menu and module-picker icons declared by the bootstrapped
content types instead of emitting the complete icon catalog.

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

Static HTML and flight responses require browser revalidation, so a regenerated
path cannot remain hidden behind a stale browser cache. Requests carrying the
manager preview token bypass the static route cache entirely and are served
with `Cache-Control: no-store`.

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

The build report includes elapsed time and lists prerendered routes with their
HTML, flight, raw client asset, and gzip transfer sizes, followed by each client
bundle with its raw and gzip sizes, runtime routes, the manager's initial
payload and complete lazy output, server bundle, and total output size. Large
route and bundle lists keep their first and last entries and collapse the middle. The programmatic
`RakunBunApplication.build()` result exposes the same per-route asset and byte
metadata through `routes`.

Run the production output with `rakun-bun start` or `bun dist/server.js`.
Production assets are gzip-compressed on demand with Bun's native compressor
when the browser advertises support through `Accept-Encoding`. Compressed bytes
are cached in memory, while development serves the original files to keep
rebuilds immediate.

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
