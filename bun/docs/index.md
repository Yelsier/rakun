# `@rakun-kit/bun` AI usage manual

Use this package when a Rakun application runs API, manager, and web rendering
in one persistent Bun 1.4 process. Read the core manual first.

## Setup

Install `@rakun-kit/bun`, `@rakun-kit/core`, `@rakun-kit/manager-react`,
`@rakun-kit/react`, `react`, and `react-dom`. Create a default-exported, typed
`RakunBunConfig` object and scripts for `rakun-bun dev`, `rakun-bun build`, and
`rakun-bun start`. Its `bootstrap` field accepts the same
`RakunBootstrapOptions` as the other Rakun adapters; the other fields belong to
the Bun framework.

```ts
import type { RakunBunConfig } from '@rakun-kit/bun'
import { createRakunBootstrap } from './src/rakun/bootstrap'

const bunConfig: RakunBunConfig = {
  bootstrap: createRakunBootstrap,
  modulesDir: './src/modules',
  revalidation: { token: process.env.RAKUN_REVALIDATE_TOKEN! },
}

export default bunConfig
```

Defaults: API `/api`, manager `/manager`, modules `src/modules`, output `dist`,
port `3000`, RSC transport `/_rakun/rsc`, assets `/assets`, and path
revalidation `/_rakun/revalidate`.

`public/` sits beside `src/` and is served from `/` before Rakun page rendering,
like Next.js `public/`. A production build copies it to `dist/public`; development
reads directly from the source directory.

Bun's native password implementation is used for manager passwords, so Bun
applications do not need to install `bcrypt`.

Manager preview is enabled for the same origin by default. Disable it with
`manager: { preview: false }`, or configure `manager.preview.webBaseUrl` and
`manager.preview.tokenParam` for a separate web host or custom query parameter.
The Bun web handler resolves the preview token through Rakun's
`web.previewPage` operation.

## Module rules

Create `src/modules/Name.tsx` or `src/modules/Name/index.tsx`. Do not create or
maintain a registry. Module names come from the file or containing directory;
duplicates fail. Export a default component or named `component`.

Modules without a client dependency render only on the server. Put `'use client'`
at the top of modules needing hooks or browser APIs. Rakun follows static imports
and promotes a module to a client boundary when it reaches a client component,
including `Image` and other client exports from `@rakun-kit/react`. The build emits one
self-contained browser bundle per client boundary. It does not create shared
chunks between web modules, navigation, and the manager; the page flight lists
only the bundles used by that destination. Content props do not participate in
bundle identity. The manager is a separate split graph under `/assets/manager/`,
so its `React.lazy` route chunks retain on-demand loading without becoming web
dependencies. In production, its static shell dependencies are folded into one
initial script and each built-in manager screen remains a lazy root bundle;
only dependencies shared by multiple screens stay as supporting chunks. The
Bun build also includes only the Lucide menu and module-picker icons declared
by bootstrapped content types, avoiding a chunk for every icon in the library.
Internal links prefetch their flight and destination client modules on hover,
focus, or touch; API and manager links are excluded from this client navigation.
The public `Link` component opts into this behavior by default and accepts
`prefetch={false}` to skip prefetching for an individual web link.
Client modules can import `usePathname()` from `@rakun-kit/bun` to read the
server-rendered pathname and react to Rakun navigation, including browser back
and forward navigation. Like other React hooks, use it only from a client
boundary.

Missing routes use an empty built-in `NotFound` module and return HTTP 404.
Create `src/modules/NotFound.tsx` to override its rendered content; the adapter
keeps the 404 marker and status.

## Routes and cache

Core `web.staticPaths` drives static generation; core `web.page` resolves page
modules and props. Unknown/dynamic paths render at request time. Static paths
persist immutable generations containing `index.html`, `flight.rsc`, and route
metadata.

Call only `invalidatePath(path)` at the framework boundary. Core calculates
which paths are affected. Regeneration finishes and persists a new generation
before the live in-memory pointer changes. Do not add content relationships,
module invalidation, tags, or `invalidateTag` to this package.

Static HTML and flight responses require browser revalidation after a path is
regenerated. Manager preview-token requests bypass the static route cache and
use `Cache-Control: no-store`, so they always render their preview payload.

Production keeps only a bounded LRU of rendered routes in process memory.
Entries unused for five minutes are released and transparently reloaded from
the latest complete disk generation; they are not regenerated merely because
their memory entry expired. Gzip-compressed assets use a separate bounded LRU.
Defaults are 128 routes, 32 MiB per cache, five-minute idle timeouts, and two
completed disk generations per route. Tune them through `cache`:

```ts
const config: RakunBunConfig = {
  cache: {
    routeMaxEntries: 64,
    routeMaxBytes: 16 * 1024 * 1024,
    routeIdleTimeoutMs: 60_000,
    routeMaxGenerations: 2,
    assetMaxBytes: 16 * 1024 * 1024,
    assetIdleTimeoutMs: 60_000,
  },
}
```

An idle timeout of `0` disables time-based eviction; a byte or entry limit of
`0` disables that in-memory cache. At least one complete disk route generation
is always retained.

## Manager and API

The manager is bundled from `@rakun-kit/manager-react` and mounted at
`/manager` unless disabled with `manager: false`. It uses the configured API
base path. Its browser graph is independent from the public web graph, so
manager code is never shared with or downloaded by a web page. The API handler
exposes core operation definitions, preserves auth cookies and origin checks,
records all operation errors through core, serves the configured binary media
upload operation, and exposes core SSE realtime.

Bun supplies the manager `linkComponent`, so its browser router controls clicks
and prefetches built-in manager route chunks on hover, focus, or touch.

## Document convention

Create `src/document.tsx` for the application shell. Its default export is a
server component receiving `RakunBunDocumentProps`; render `<html>`, `<head>`,
`<body>`, and `{children}` like a Next.js root layout. The framework injects
page SEO, styles, navigation scripts, and `#rakun-root`; CSS imported by the
document is bundled as a global stylesheet. The component also receives `page`,
`path`, and `assets` when the shell needs request context; use
`page.language?.code` for the document language. A top-level
`'use client'` directive is rejected. Keep user-facing content in Rakun literals;
the shell should not hardcode content copy.

Configure PostCSS through `css.plugins`. Rakun applies those plugins to CSS
files from the application source tree during development and production, so a
Tailwind v4 setup imports its source stylesheet directly from `document.tsx`:

```sh
bun add -d tailwindcss @tailwindcss/postcss
```

```ts
import tailwindcss from '@tailwindcss/postcss'

const bunConfig: RakunBunConfig = {
  css: { plugins: [tailwindcss()] },
}
```

Use `@import 'tailwindcss';` in that stylesheet. Rakun serves the processed
asset; do not add a separate generated stylesheet or CSS watcher.

## Constraints

- Bun `>=1.4.0`, React `>=19`, ESM only.
- Filesystem page routing and Server Actions are unsupported.
- Navigation uses Rakun's path-scoped `text/x-component` render payload; client
  boundaries hydrate as isolated React roots.
- Development changes under `src` or an external module directory trigger an
  incremental graph rebuild when possible and a rendered-tree hot update over
  WebSocket. Server-only changes keep the existing browser and manager assets;
  static routes are invalidated and regenerated lazily on the next request.
  Failed rebuilds leave the current application active, while browser-side
  update failures fall back to reload.
- Development treats every web route as dynamic: it does not call
  `web.staticPaths`, prerender routes, populate the route cache, or return
  cacheable web/flight responses. A page marked static by core is still rendered
  per request with `Cache-Control: no-store`. Static generation and route-cache
  persistence remain production behavior. Rakun initialization and development
  code compilation run concurrently during startup.
- Normal development web pages automatically bundle the Rakun toolbar. It shows
  route/document metadata, links to the configured manager, lists and highlights
  layout/template/content modules without adding DOM wrappers, and exposes each
  module's props. Flight navigation and live reload update it in place. Manager
  preview pages omit it because they use the dedicated preview inspection flow.
  Production builds contain no toolbar code, payload, or module markers.
- The initial development build writes disposable browser-build metadata and
  assets under `.rakun/cache`, independently from `dist`. A later `rakun-bun dev`
  checks unchanged input metadata immediately and hashes only changed candidates
  before reusing its client-module, navigation, and manager assets. Relevant
  config, the client module set, cached outputs, Bun, and framework build code are
  also validated. Incremental client rebuilds refresh this persistent state for
  the next process. The development server graph is cached and validated
  separately, then imported fresh into each process; any changed source input
  rebuilds it. Keep `.rakun/` ignored; deleting it safely forces a cold
  development build.
- `rakun-bun build` reports elapsed time, generated routes, HTML and flight
  bytes, raw and gzip client asset sizes, client bundle sizes and usage, runtime
  routes, manager initial size, lazy page and supporting chunk counts, total
  lazy output size, server size, and total output. While running, it reports the
  current phase with a spinner and elapsed time on interactive terminals, or
  stable non-ANSI lines in redirected output and CI. Long route and bundle lists
  collapse their middle entries.
  `RakunBunApplication.build()` exposes the underlying per-route metadata
  through `result.routes`.
- Production assets are compressed on demand with Bun's native gzip support
  when requested through `Accept-Encoding`; compressed bytes use the bounded
  memory cache described above. Development assets remain uncompressed.
- `await app.stop()` closes the HTTP server and watchers, clears Bun memory
  caches, and calls core `shutdownRakun()`. `startRakunBun()` installs graceful
  `SIGTERM`/`SIGINT` handling, including MongoDB closure.
- No `invalidateTag` support.
