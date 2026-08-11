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

Choose one server adapter (`next` or `express`). Add `trpc` only if the host
wants tRPC, one media adapter if uploads are required, and one mail adapter if
outbound mail is required. `manager-react` is normally consumed through the
Next adapter; use it directly for custom hosts.

`preview` and `preview-next` are private example applications in the Rakun
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
bun add @rakun-kit/core mongodb bcrypt sharp zod
```

`mongodb`, `bcrypt` and `sharp` are peer dependencies. Install only compatible
versions declared by the package. Adapters and optional services are separate
packages.

## Bootstrap

```ts
import { ContentType, f, rakunBootstrap } from '@rakun-kit/core'

const Article = new ContentType({
  name: 'Article',
  menu: { title: 'Articles', icon: 'newspaper', category: 'Content' },
  fields: {
    title: f.string().required(),
    slug: f.string().type('Slug').required(),
    body: f.string().type('RichText'),
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
`mail`, `translation`, `managerLanguages`, `login`, `accountRecovery`, `logger`
and `syncRoutes`.

- `rakunBootstrap(options)` registers configuration synchronously.
- `ensureRakunBootstrap(options)` registers it only if needed. Framework
  adapters use this to tolerate development reloads.
- `ensureRakunInitialized()` initializes logger, MongoDB, media and route sync.
  It is concurrency-safe and retries after a failed initialization.

Do not import React, Next, Express, Vite or tRPC into core configuration modules.

## Content types and fields

`ContentType` describes a collection and derives its validation and TypeScript
shapes. Use `f` factories rather than handwritten storage schemas.
`Fields` remains available as a backward-compatible alias and references the
same object, but new code and examples should prefer `f`.

Common factories include string, number, boolean, date, object, relation, file,
blocks and array/list forms. Chain field modifiers such as `.required()`,
`.multiple()`, `.managerOnly()`, `.apiOnly()` and `.noDynamic()` when applicable.
Special manager editors are selected with `.type(...)`, for example `Slug`,
`RichText`, `Email`, `Password` and `Image`.

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
  ],
})
```

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

The media manager can reimport an existing image with its currently selected
optimization settings. Rakun writes the replacement and responsive variants
under new storage keys, updates the existing `Media` record in place, and only
then removes the previous objects, so content relations keep the same media ID.
When `generatePreview` is enabled, optimization stores a tiny `data:image/...`
LQIP string on `previewUrl` instead of uploading a separate preview object.
Older media that still have a `previewKey` continue to resolve normally.

## Manager languages and user-facing text

Web/content-facing text belongs in Rakun literals. Manager UI text belongs in
the manager catalog. English manager copy is built into `manager-react`; add
optional packs such as Spanish through `@rakun-kit/manager-locales/es` and
`managerLanguages`.

Project-defined manager labels may use arbitrary keys. Field labels follow
`field.<fieldName>` and layout slots follow `layoutModule.<layoutKey>`.
The public `manager.uiLocales` response also exposes a validated HTTP(S) SEO
`siteUrl` for manager chrome; no other SEO settings are included.

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
