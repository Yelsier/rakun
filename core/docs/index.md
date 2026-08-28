# Rakun AI manual and package index

This is the entry point for coding agents working on an application that uses
Rakun. It describes the package map, the normal architecture, and the public
surface of `@rakun-kit/core`. Read the manual for every adapter used by the
application before editing its integration.

In an installed project this file is located at
`node_modules/@rakun-kit/core/dist/docs/index.md`. Other package manuals use the
same `dist/docs/index.md` location.

## Package map

| Package                         | Use it for                                                                          | Installed manual                                                |
| ------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `@rakun-kit/core`               | Domain model, bootstrap, operations, auth, routes, media, mail and shared contracts | This file                                                       |
| `@rakun-kit/next`               | Next.js App Router API, manager, media and web rendering                            | `node_modules/@rakun-kit/next/dist/docs/index.md`               |
| `@rakun-kit/express`            | Express API and local-media adapter                                                 | `node_modules/@rakun-kit/express/dist/docs/index.md`            |
| `@rakun-kit/bun`                | Bun server, manager, filesystem modules, SSR and static route generation            | `node_modules/@rakun-kit/bun/dist/docs/index.md`                |
| `@rakun-kit/trpc`               | Typed tRPC router for manager and web operations                                    | `node_modules/@rakun-kit/trpc/dist/docs/index.md`               |
| `@rakun-kit/react`              | Framework-neutral React module rendering                                            | `node_modules/@rakun-kit/react/dist/docs/index.md`              |
| `@rakun-kit/manager-react`      | Manager UI, clients, navigation and plugin runtime                                  | `node_modules/@rakun-kit/manager-react/dist/docs/index.md`      |
| `@rakun-kit/manager-locales`    | Optional manager UI locale packs                                                    | `node_modules/@rakun-kit/manager-locales/dist/docs/index.md`    |
| `@rakun-kit/s3`                 | S3 and S3-compatible media storage                                                  | `node_modules/@rakun-kit/s3/dist/docs/index.md`                 |
| `@rakun-kit/smtp`               | SMTP mail delivery                                                                  | `node_modules/@rakun-kit/smtp/dist/docs/index.md`               |
| `@rakun-kit/resend`             | Resend mail delivery                                                                | `node_modules/@rakun-kit/resend/dist/docs/index.md`             |
| `@rakun-kit/jsx-email`          | Typed JSX Email template rendering                                                  | `node_modules/@rakun-kit/jsx-email/dist/docs/index.md`          |
| `@rakun-kit/openai`             | OpenAI-backed automatic content translation                                         | `node_modules/@rakun-kit/openai/dist/docs/index.md`             |
| `@rakun-kit/plugin-code-editor` | Code blocks in manager RichText fields                                              | `node_modules/@rakun-kit/plugin-code-editor/dist/docs/index.md` |
| `create-rakun-app`              | Official project generator and framework starter templates                          | `node_modules/create-rakun-app/dist/docs/index.md`              |

Choose one server adapter (`next`, `express`, or `bun`). Add `trpc` only if the host
wants tRPC, one media adapter if uploads are required, and one mail adapter if
outbound mail is required. `manager-react` is normally consumed through the Bun
or Next adapter; use it directly for custom hosts.

`preview`, `preview-bun`, and `preview-next` are private example applications in the Rakun
repository, not installable packages, so they do not have installed manuals.

## Typical architecture

1. Define literals, content types, routes and any custom operations in
   framework-neutral server modules.
2. Call `rakunBootstrap` once, or pass the same options to an adapter that calls
   `ensureRakunBootstrap`.
3. Mount the API with `@rakun-kit/next` or `@rakun-kit/express`.
4. Render the manager and web modules with the corresponding React integration.
5. Keep browser code away from server secrets and server-only package entries.

## Install and peer requirements

```sh
bun add @rakun-kit/core mongodb ffmpeg-static zod
# Node.js image optimization only
bun add sharp
```

`mongodb` and `ffmpeg-static` are peer dependencies. `bcrypt` is only needed by
Node runtimes; Bun uses its native password implementation. `sharp` is an
optional peer used by the default Node.js image processor and as the fallback
for Bun versions without `Bun.Image`. Adapters and optional services are
separate packages.

## Bootstrap

```ts
import { ContentType, f, rakunBootstrap } from '@rakun-kit/core'

const Article = new ContentType({
  name: 'Article',
  menu: { title: 'Articles', icon: 'newspaper', category: 'Content' },
  fields: {
    title: f.string(),
    slug: f.string().type('Slug'),
    body: f.string().type('RichText').optional(),
  },
  uniques: [['slug']],
  listFields: ['title', 'slug'],
})

rakunBootstrap({
  literals,
  contentTypes: [Article],
  routes,
  mongo: {
    MONGO_URI: process.env.MONGO_URI!,
    ENVIRONMENT: process.env.NODE_ENV === 'test' ? 'test' : 'production',
  },
})
```

Important bootstrap options are `literals`, `contentTypes`,
`internalContentTypes`, `routes`, `apiOperations`, `plugins`, `mongo`, `media`,
`mail`, `translation`, `collaboration`, `managerLanguages`, `login`,
`accountRecovery`, `logger` and `syncRoutes`.

- `rakunBootstrap(options)` registers configuration synchronously.
- `ensureRakunBootstrap(options)` registers it only if needed. Framework
  adapters use this to tolerate development reloads.
- `ensureRakunInitialized()` initializes logger, MongoDB, media and route sync.
  It is concurrency-safe and retries after a failed initialization.

Do not import React, Next, Express, Vite or tRPC into core configuration modules.

## Runtime platform

Core domain code consumes a resolved `Platform` instead of importing runtime
image, crypto, filesystem, compression, or worker APIs. Omit `platform` to
detect Node.js or Bun and apply standalone defaults, or compose capabilities:

```ts
import { createPlatform, pollingRealtime, sharpImage } from '@rakun-kit/core'

rakunBootstrap({
  // ...normal Rakun options
  platform: createPlatform({
    deployment: 'serverless',
    image: sharpImage(),
    realtime: pollingRealtime({ intervalMs: 5_000 }),
  }),
})
```

Runtime, framework, and deployment remain independent dimensions. Runtime is
detected from `process.versions.bun`. Bun uses native `Bun.Image` when present;
Node.js and older Bun versions use `sharp`. The Bun adapter also falls back to
`sharp` when an OS-dependent codec cannot decode or encode the requested
format, so install the optional peer when formats such as AVIF must work across
all Bun hosts. `createPlatform` supplies every other default, so overrides
never require listing unrelated capabilities.

Every custom `ImageProcessor` implements `metadata`, `transform`, and
`placeholder`. `placeholder` returns `{ dataUrl, mime }` for direct storage as
an inline LQIP. The Bun adapter uses the native `Bun.Image.placeholder()` data
URL, while the Sharp adapter applies the requested reduced transform and
encodes its result as a data URL. Bun falls back to that Sharp path when its
runtime lacks the placeholder method or its native codec reports an unsupported
format or encode failure.

Realtime synchronization uses `pollingRealtime` or `sseRealtime`, both of
which expose transport metadata and a topic subscription contract. Polling is
the conservative default. `@rakun-kit/next` and `@rakun-kit/express`
automatically serve a configured SSE endpoint.
`sseRealtime()` defaults to `/realtime` relative to the adapter's API mount;
set `endpoint` only for a custom public route.

Custom server adapters can compose the framework-neutral helpers exported by
core: `parseRealtimeTopics`, `isRealtimeEndpointRequest`,
`createRealtimeSseStream`, and `authorizeRealtimeSubscription`. The host
remains responsible only for mapping its request/response APIs to those
primitives.

The built-in SSE provider keeps topic listeners in the current process.
Replicated deployments must supply a shared-broker `RealtimeProvider` that
implements the same `metadata`, `subscribe`, and `publish` contract.

`manager.uiLocales` exposes the provider's safe transport metadata so the
manager selects the same transport automatically. Core publishes stable
invalidation topics after collaboration updates and mutations affecting locale
variants, versions, comments, or notifications. Topic builders are exported
from `@rakun-kit/core/client`; use those helpers on both sides of custom
integrations instead of duplicating topic strings.

## Collaborative content working state

Saved content documents have a Yjs working document identified by content type
and document `_id`. This includes published documents and every independent
draft/version. Incremental edits converge in that working document; they do not
update the normal MongoDB content record, rebuild routes, or run `revalidate`.
The public web API therefore continues to read the last saved JSON snapshot.

`manager.contentCollaboration.sync` exchanges state vectors and incremental
updates over the normal authenticated HTTP operation transport. It is
idempotent protocol traffic and is not a business mutation.
`manager.contentCollaboration.save` is the explicit commit boundary: core
materializes the server-side `Y.Doc`, validates it with the normal
`ContentType`, persists the snapshot through the existing update flow, and then
runs revalidation. Promoting a draft remains a separate operation and consumes
its saved snapshot.

`manager.contentCollaboration.discard` replaces the shared working document
with the last persisted content snapshot and advances its saved state vector,
so every connected editor converges on the restored state without writing a
new content revision. It is a mutation because it intentionally removes shared
working changes.

Shared content templates use the same protocol through
`manager.templateCollaboration.sync` and
`manager.templateCollaboration.save`. Their room is keyed only by content type,
so editors working from different documents still see the same template. The
save operation validates and persists it through the normal template update
flow. `manager.templateCollaboration.discard` provides the equivalent reset to
the last persisted shared template. Template state never becomes part of an
individual content document's room.

The React manager combines this server protocol with per-user IndexedDB
persistence. Cached Yjs rooms can be opened and edited during a temporary API
outage and upload their missing updates after reconnection. This local cache is
working state only: the authenticated server Save remains the persistence
boundary for MongoDB and public reads.

Core uses a process-memory collaboration adapter by default. This preserves
unsaved changes across manager navigation while that API process lives. A
multi-process or restart-durable deployment must pass a shared adapter through
`rakunBootstrap({ collaboration: { adapter } })`. An adapter stores opaque Yjs
updates and saved state vectors; it must not write them into the public content
document. `createMemoryCollaborationAdapter` is exported as the reference
implementation.

Collaboration sync also carries ephemeral presence for each open browser tab.
Presence reports the authenticated manager user and the currently focused
field, expires automatically, and is never included in the saved Yjs snapshot
or persistent event log. Custom shared adapters may implement the optional
`loadPresence` and `savePresence` methods to share this state across replicated
API processes; adapters without them keep presence local to one process.
On SSE deployments, core authorizes the collaboration room independently,
binds the tab presence to that stream, renews it from server heartbeats, and
removes it when the tab's last stream closes. This avoids client-side periodic
sync calls whose only purpose is presence. Polling uses its existing sync cycle.

This feature is scoped to saved content edit screens and their shared Template
editor. Create-form content becomes collaborative after its first save; its
shared Template is already collaborative because it exists independently of
that new document. Settings, route-layout overrides, literals, users, and other
administrative forms keep their existing local form state. Automatic content
translation updates the shared working document and still requires Save before
it changes the stored snapshot.

## Content types and fields

`ContentType` describes a collection and derives its validation and TypeScript
shapes. Use `f` factories rather than handwritten storage schemas.
`Fields` remains available as a backward-compatible alias and references the
same object, but new code and examples should prefer `f`.

Common factories include string, number, boolean, date, object, relation, file,
blocks and array/list forms. Fields are required by default; chain `.optional()`
when a value may be omitted. `.required()` remains available as an
explicit, backward-compatible modifier. Other modifiers include `.multiple()`,
`.managerOnly()`, `.apiOnly()` and `.noDynamic()` when applicable.
Special manager editors are selected with `.type(...)`, for example `Slug`,
`RichText`, `Email`, `Password` and `Image`.

Plugin field factories created with `createPluginField` must declare
serializable `meta.capabilities`. `valueKind` (`string`, `richText`, `number`,
`boolean`, `date`, `object`, `array`, or `unknown`) drives Dynamic Data type
compatibility. Under `dynamic`, `properties` exposes named leaf paths,
`mapProperties` allows those paths to be mapped independently, `relation`
enables content-type traversal, and `collection` enables homogeneous or
heterogeneous per-item mapping. This lets custom fields participate without
adding their names to manager or core type switches.

Custom server resolution belongs in the optional `runtime.populate` callback.
It receives `{ db, populate, populateLink }`, so a composite field can recurse
through nested fields or reuse Rakun's localized link resolver. Runtime hooks
are not sent to the manager. The generic web-output phase is exported as
`populateFields`; the former `populateLinks` name remains as a deprecated alias.

Homogeneous `f.array(...)` fields accept `.min(count)` and `.max(count)` item
limits. These methods are also available after `.multiple()` on relation, file,
select, and content-reference fields, for example
`f.file().multiple().min(1).max(4)`. Core enforces them on input, stored data and
output schemas, and exposes `minItems`/`maxItems` to the manager.

Routeable content types can initialize SEO string fields from the document being
created. Add `.seo('<seoField>')` to a source string field; the argument is
restricted to string properties of Rakun's built-in SEO model. For example,
`title: f.string().required().seo('title')` initializes `seo.title` as a dynamic
data binding to the document's `title`. This only initializes create forms: it
does not modify existing documents, and editors can change or clear the binding
before saving.

Date fields support the `Date`, `DateTime` and `Time` manager modes. `Date` and
`DateTime` persist JavaScript `Date` values; their write schema also accepts the
ISO datetime strings produced when those values cross JSON and normalizes them
back to `Date`. `Time` stores an ISO time string.

The `f.link()` manager editor stores a direct `{ href, title }` value or an
internal `{ routeId, contentTypeId, title }` reference. Web output for these
values is `{ href, title }`, with internal `href` values localized by route.
`DataInput` and `DataFront` use those object shapes. Persisted legacy URL strings
remain readable, then receive an empty `title` when loaded in the manager or
normalized for web output. Dynamic data exposes link source properties as
`<field>.href` and `<field>.title`; list mapping targets expose those same two
paths independently and reconstruct the link object from their mapped values.

Use `f.menu()` for header and navigation trees. Its value is an ordered array
of link nodes with recursive `children`: direct nodes persist
`{ href, title, children }`, while internal nodes persist
`{ routeId, contentTypeId, title, children }`. Core validates every level and
recursively resolves internal nodes for web output as
`{ href, title, children }`. The manager can reorder and nest nodes with drag
and drop; there is no fixed nesting-depth limit.

`f.breadcrums()` declares a computed, API-only field intended for modules such
as heroes. When the module is rendered in a routable page, the field returns
`{ label, href }[]` from the highest route ancestor through the current page,
using localized route labels and paths. It returns `null` outside routable page
output. The field is part of `DataFront`, but not `DataInput` or `DBOutput`, and
does not appear in the manager.

Use `iterator` for ordered page modules. Rakun stores it as the reserved
`_iterator` field and edits it in the manager's Content tab. When the content
type has a `hasPage: true` route, Rakun automatically enables a separate shared
Template composition using the same module list as `iterator`. The Template
editor makes a special Content slot available at the root and inside
`f.blocks(...)`. A valid template contains exactly one such slot; web and
preview output replace it with the current document's iterator.

```ts
import { StructuredData } from '@rakun-kit/core/internal-content-types'

const Page = new ContentType({
  name: 'Page',
  fields: {
    title: f.string().required(),
    slug: f.string().type('Slug').required(),
  },
  iterator: [
    { contentType: UseCaseSection, type: 'new' },
    { contentType: Hero, type: 'new' },
    { contentType: LayoutWithInfo, type: 'new' },
    { contentType: Newsletter, type: 'new' },
    { contentType: StructuredData, type: 'new' },
  ],
})
```

`StructuredData` is Rakun's native JSON-LD module. Add it to an iterator to make
it available in Content and shared Templates. Its Product, Article,
Organization, WebSite, and BreadcrumbList variants expose typed fields; Custom
accepts an arbitrary JSON object. Template fields can use the normal dynamic
data mappings, so one module can describe every document of a routeable content
type. Official React and Next renderers emit the corresponding safe
`application/ld+json` script without an application module file.

Call `.help(text)` on a field to expose optional guidance from a compact help
icon in the manager. The metadata survives other field modifiers and nested
relation encoding. Pass either direct copy or a manager translation key. Use
`.description(...)` for short guidance that should remain visible below the
field label.

For example, place Content inside an otherwise empty
`LayoutWithInfo.fields.blocks` list to render the document-specific sections
inside that shared wrapper. Route `layout` modules such as header and footer
remain outside the assembled template.

Content type names, field names and reserved fields are persisted API. Do not
rename them without a data migration and a review of manager and web consumers.
Use `.withHooks(...)` for lifecycle behavior; keep mutations and secrets out of
`onGet` transformations unless that behavior is explicitly intended.

Dynamic data list mappings may map a target `blocks`, link-array, or
relation-array field recursively. A map entry with `kind: 'list'` contains the
same `contentType`, optional `source` or `query`, `itemName`, and `map` shape as
a top-level list binding. In its query,
`{ $current: 'path' }` resolves against the parent source item and
`{ $document: 'path' }` resolves against the root document. The manager exposes
these values as `Current item` and `Current document`, respectively, supporting
flows such as Category -> gallery item -> related Project -> nested image card.
Source and target dynamic-field rules are enforced at every level.

Homogeneous link and relation arrays also accept per-item list mappings, at the
top level or recursively. This includes `f.relation(...).multiple()`, which is
the relation-array shorthand. Link items map `title` and `href`; relation items
map fields from their target content type. These arrays resolve to flat items,
while `f.blocks(...)` remains heterogeneous and resolves each item as
`{ name, value }`. A structured array may still use a direct whole-field binding.

## Routes and web output

Routes connect a content type field to a public URL. A page route may also have
a fixed `layout` with module slots and a `{ type: 'content' }` insertion point.
When a content type has a `hasPage: true` route, core adds optional `_seo`
metadata and can expose generated `href` values to dynamic data.

The `web.page` and `web.previewPage` responses expose modules only through their
required `layout` array. Document modules are in the `modules` property of the
`{ type: 'content' }` item; there is no duplicate top-level `modules` property.
Not-found responses use the same shape, while redirects return an empty layout.

The optional `info` object contains normal resolved page fields and route context
such as `locale` and `variantGroupId`. Translated website literals live in the
separate top-level `literals` property. Core removes the composition-only
`_iterator`, `_seo`, and legacy `_iteratorUnlinked` fields recursively,
including from populated child relations, so nested page modules and SEO data
are not duplicated in `info`.

Use `@rakun-kit/core/web` for framework-neutral web types/utilities. Use the
Next or React manual for actual rendering. Route changes can affect configured
redirects, sitemap, robots output, preview, and adapter behavior.

The built-in `LlmsSettings` record backs an optional site-level `llms.txt`.
Editors curate a title, summary, free-form guidance, ordered sections, and
internal or external links in Manager Settings. Core renders the Markdown via
the public `web.llms` query; `getRakunWebLlmsTxt` provides the equivalent
server-only call. It resolves internal links for the requested language, uses
SEO `siteUrl` to make links absolute, and falls back to SEO `siteName` and the
default SEO description when title or summary is omitted. Disabled or unusable
configuration returns `null`. Only explicitly selected resources are included;
internal links without a public route are omitted while their section heading
remains. In Manager, routeable content types with document
visibility expose only published documents in this picker. Entries marked
optional are grouped under the conventional `## Optional` heading and retain
their section titles as third-level headings.

The authenticated `manager.localeVariants.list` result exposes `path` on a
language assignment only when its exact document is published and has a route
map. This is the supported manager-facing way to build a contextual View page
action; do not query hidden `RouteMap` records from manager UI code.

For routeable content types with document visibility, only explicit
`published` and `hidden` values are eligible for the route map or public page
resolution. A legacy document with no `_visibility` is treated as a draft;
this fail-closed check also prevents an obsolete `RouteMap` entry from exposing
its content.

The public `web.staticPaths` query returns `{ path, ttl }` entries only for
route-map records whose configured page route has `dynamic: false`. Framework
adapters use it to generate static params and choose an ISR lifetime. A
monolithic server adapter may instead call the server-only
`getRakunWebStaticPaths`, `getRakunWebPage`, and `getRakunWebPreviewPage`
exports after bootstrap and initialization, avoiding an HTTP request to itself
during a framework build.

Set `revalidate: { url, token }` in bootstrap to notify the web host after a
manager mutation changes a public path. Core sends an authenticated `POST`
containing `{ path }`; the host adapter is responsible for invalidating its
page and data caches.

## Custom operations

Define public API behavior with the operation helpers and Zod input/output
schemas. Register the map through `apiOperations` so adapters and typed clients
share one contract.

```ts
import { defineOperation } from '@rakun-kit/core'
import { z } from 'zod'

export const apiOperations = {
  'demo.hello': defineOperation({
    access: 'public',
    kind: 'query',
    method: 'get',
    input: z.object({ name: z.string() }),
    output: z.object({ message: z.string() }),
    resolve: ({ input }) => ({ message: `Hello ${input.name}` }),
  }),
}
```

Keep operations in server modules. Client code should import the operation map
with `import type` and use the typed client supplied by its adapter.

Every API error, including expected 4xx errors, must reach Rakun's persistent
event log without persisting payloads, credentials, sensitive causes or raw
internal error messages. Successful mutations already emit
`<operation>.succeeded`; add explicit domain events for meaningful phases,
external effects or partial outcomes. Queries are not logged by default.

## Request context, auth and permissions

Adapters create a Rakun request context from headers, cookies and their response
abstraction. Prefer existing helpers such as `getUser`, `checkPermissions` and
`checkOwnership`; do not duplicate authorization rules in application code.

External manager login adapters are configured under `login.adapters`.
Provider emails must be verified and match an existing manager user; Rakun does
not provision users automatically. Password login can use persistent IP
blocking. Account recovery requires both a mail service and
`accountRecovery.passwordReset` configuration.

## Media, mail and translation

Core defines service contracts; concrete integrations are separate:

- Media: use `@rakun-kit/s3`, or local media from the selected framework
  adapter. Configure the result as `media` in bootstrap.
- Mail: use `@rakun-kit/smtp` or `@rakun-kit/resend`; optionally render typed
  templates with `@rakun-kit/jsx-email`. Configure delivery as `mail`.
- Translation: use `@rakun-kit/openai` or implement the core translation
  adapter contract. Configure it as `translation`.

Never expose adapter credentials in client modules. Public and private media
have different URL semantics; do not replace stored media objects with raw URLs.
The built-in manager upload protocol preserves Unicode original file names,
including accents, non-Latin scripts, and emoji, while storage object keys stay
adapter-safe.

The media manager can reimport an existing image or video with its currently
selected optimization settings. Rakun writes the replacement and its variants
under new storage keys, updates the existing `Media` record in place, and only
then removes the previous objects, so content relations keep the same media ID.
The `manager.media.replace` mutation applies the same safe storage sequence to
a newly uploaded image. It preserves the existing media ID, editorial details,
folder and relations while replacing its file metadata and generated variants,
then revalidates documents that reference it when route revalidation is configured.
When `generatePreview` is enabled, optimization stores a tiny `data:image/...`
LQIP string on `previewUrl` instead of uploading a separate preview object.
Its exact MIME may be selected by the runtime image processor; native Bun
placeholders are PNG data URLs, while Sharp uses the configured output format.
Older media that still have a `previewKey` continue to resolve normally.

Optimized video uploads use the `ffmpeg-static` peer dependency. Rakun keeps
MP4 as the primary object and exposes both MP4 and WebM entries through the
media `sources` array (`key`, resolved `url`, `mime`, and `size`). Existing
image-only `FileOptimizeOptions` remain valid; video quality defaults to 80 and
can be set with `video: { quality }`.

## Manager languages and user-facing text

Web/content-facing text belongs in Rakun literals. Manager UI text belongs in
the manager catalog. English manager copy is built into `manager-react`; add
optional packs such as Spanish through `@rakun-kit/manager-locales/es` and
`managerLanguages`.

Project-defined manager labels may use arbitrary keys. Field labels follow
`field.<fieldName>` and layout slots follow `layoutModule.<layoutKey>`.
The public `manager.uiLocales` response also exposes a validated HTTP(S) SEO
`siteUrl` for manager chrome and the configured home-page variant group for SEO
audits; no other SEO settings are included.

SEO audit snapshots are stored in the hidden internal `SeoAudit` content type.
It shares the `SeoSettings` permission resource: `own` permits creating dated
site or page reports, while `readAny` permits viewing reports created by other
editors. The manager uses normal content operations for this persistence, so
successful report creation is covered by the standard mutation event log.

## Public entrypoints

- `@rakun-kit/core`: bootstrap and the main domain/runtime API.
- The main server entry also exports `getRakunWebPage`,
  `getRakunWebPreviewPage`, and `getRakunWebStaticPaths` for server adapters
  that share Rakun's process and database.
- `@rakun-kit/core/contracts`: shared schemas, operation and locale contracts.
- `@rakun-kit/core/client`: browser-safe client types and utilities.
- `@rakun-kit/core/manager`: manager operation metadata and types.
- `@rakun-kit/core/web`: web output types and utilities.
- `@rakun-kit/core/types`: content-type-derived helpers.
- `@rakun-kit/core/logger`, `/errors`, `/literals`, `/api-utils`, `/plugins`,
  `/event-log` and `/internal-content-types`: focused public surfaces.

Import only declared package entrypoints. Do not reach into `dist/esm`,
`dist/cjs` or source paths.

## Agent checklist

- Identify the host adapter and read its installed manual.
- Confirm an API is exported before importing it.
- Preserve the server/browser boundary and use `import type` for contracts.
- Reuse core validation, auth, operation, logging and service abstractions.
- Treat persisted names and public schemas as compatibility boundaries.
- Update application tests when content, routes, permissions or operation
  behavior changes.
