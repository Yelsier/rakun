# Rakun Next Preview

Next.js App Router preview for `@rakun-kit/next`.

## Setup

Create `preview-next/.env.local` from `.env.example`:

```bash
MONGO_URI=mongodb+srv://USER:PASSWORD@HOST/DATABASE
SEED_PREVIEW=true
PREVIEW_ADMIN_EMAIL=admin@rakun.local
PREVIEW_ADMIN_NAME=Preview Admin
PREVIEW_ADMIN_PASSWORD=admin1234
RESEND_API_KEY=
RAKUN_MAIL_FROM=
RAKUN_MANAGER_URL=http://localhost:3000/backend
```

Run the app:

```bash
bun run dev
```

Open:

- `http://localhost:3000` for seeded home page
- `http://localhost:3000/use-cases/multi-market-campaign/` for the shared
  template example
- `http://localhost:3000/use-cases/product-stories/` for a second document
  using the same template
- `http://localhost:3000/backend` for manager

Default seeded login:

```text
admin@rakun.local / admin1234
```

## Plugin code editor

This preview registers `@rakun-kit/plugin-code-editor` in the manager client
boundary at
`app/backend/[[...slug]]/preview-manager.tsx`.

Open the seeded `Lexical Code Blocks` article in the manager to edit its
RichText code block, switch the syntax language, save it, and reopen it. This
preview limits the selector to Plain Text, JSON, JavaScript, TypeScript, HTML,
and CSS.

## Seed

The API route seeds preview data on first request when `SEED_PREVIEW` is not
`false`. Seeded data matches the Vite preview shape:

- `Language`
- preview admin role and user
- `Header` and `Footer` layout modules
- `en`, `es`, and `es-MX` locales, with `es-MX` falling back to `es`
- home, about, and contact `Page` records with seeded locale variants
- inline `HelloWorld` modules in the seeded page `_iterator`
- two `UseCase` documents with unique Content modules and one shared Template
  composed as Hero -> LayoutWithInfo(Content) -> Newsletter
- a `FeatureCarousel` module that demonstrates dynamic data bindings from
  `Project`
- a `CategoriesGallery` module that maps `Category` records and queries each
  category's related `Project.images`
- local SVG `Media` records used by the related project galleries
- an `ImagePlayground` record with 18 selected images (three distinct media
  records for each of the six SVGs) for testing compact previews and
  dialog-based reordering
- populated `f.link()` examples for an internal route in the header and a
  direct external URL in the footer
- `Author` and `Article`
- `RouteLocaleVariant` assignments and route maps for `/`, `/es/`,
  `/es-MX/`, `/about/`, `/es/sobre/`, `/es-MX/sobre-mexico/`,
  `/contact/`, `/es/contacto/`, and `/es-MX/contacto/`

The seed is idempotent and also repairs the seeded home `_iterator` so
`HelloWorld`, `FeatureCarousel`, and `CategoriesGallery` stay present after
local database reuse.

## Shared use case template

Open either seeded use case in the manager. Its Content tab contains only the
sections owned by that document. The Template tab contains the shared hero, a
two-column `UseCaseLayoutWithInfo`, and the newsletter. The built-in Content
item is nested in the layout's otherwise empty `blocks` field.

`UseCase` declares Content, Hero, LayoutWithInfo, and Newsletter once in its
`iterator`; because it is routeable, Template is enabled automatically and
offers that same module catalog plus the built-in Content item.

The hero title and summary use current-document bindings, so the same shared
hero renders different copy on each URL. Editing the aside or newsletter from
either document updates both pages, while editing Content updates only the
selected use case. Header and Footer come from the route layout and remain
outside the template.

The seeded `FeatureCarousel` is a reusable layout module. Its title can be bound
to a selected `Project`, and its item list can be populated from filtered
`Project` records. The manager stores those bindings in `_bindings`; manually
added carousel items are kept and merged with the dynamic list output.

The seeded `CategoriesGallery` demonstrates a reverse relation without storing
`Category.projects`. Its outer list comes from `Category`; the `images` mapping
queries projects whose `category._id` matches the current category and flattens
each project's `images` array:

```ts
images: {
  kind: "relatedCollection",
  contentType: Project.name,
  relation: "category",
  path: "images",
  limit: 10,
  sort: { title: "asc" },
}
```

## Custom API Operation

The preview defines `apiOperations` in `server/api-operations.ts` and passes it
to the Rakun bootstrap in `app/api/[[...rakun]]/route.ts`.

The seeded `HelloWorld` module is a client component with a button that calls
the public `demo.helloWorld` operation through the typed client:

```tsx
import { createRakunApiClient, type GetClient } from '@rakun-kit/next/web/client'
import type { apiOperations } from '../server/api-operations'

type PreviewApiClient = GetClient<typeof apiOperations>

const apiClient: PreviewApiClient = createRakunApiClient<typeof apiOperations>({
  baseUrl: '/api',
})

const result = await apiClient.query('demo.helloWorld', { text })
```

The same registry exposes `demo.sendTestMail` as a public mutation. It renders
`emails/TestEmail.tsx` with typed props and sends it through the configured
Resend adapter:

```ts
const result = await apiClient.mutation('demo.sendTestMail', {
  to: 'you@example.com',
  name: 'Ada',
  activationUrl: 'https://example.com/activate',
})

console.log(result.id)
```

Set `RESEND_API_KEY` and `RAKUN_MAIL_FROM` in `.env.local` before calling the
operation. Preview and compatibility-check the same template with:

```bash
bun run mail:preview
bun run mail:check
```

Those variables also enable manager account recovery. Password reset emails use
`RAKUN_MANAGER_URL` as their public manager base URL.

Mail attempts and results are persisted in the generic Rakun event log. Open
`/backend/debugging/logs` to inspect them through the built-in manager UI. Its
native `manager.logs.list` operation requires an authenticated session with the
`system.eventLog.read` permission and supports cursor pagination and composable
filters. Stored mail events contain operational metadata only; email content
and recipient data are intentionally excluded.

## Rendering

The page route uses `RakunPageRenderer` from `@rakun-kit/next/web`:

```tsx
<RakunPageRenderer page={page} loadModule={(name) => import(`../../modules/${name}`)} />
```

Modules in `preview-next/modules` are server modules by default. Add
`"use client"` only to modules that need hooks or browser events.

## Build

```bash
bun run build
```
