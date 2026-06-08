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
```

Run the app:

```bash
bun run dev
```

Open:

- `http://localhost:3000/en` for seeded home page
- `http://localhost:3000/backend` for manager

Default seeded login:

```text
admin@rakun.local / admin1234
```

## Seed

The API route seeds preview data on first request when `SEED_PREVIEW` is not
`false`. Seeded data matches the Vite preview shape:

- `Language`
- preview admin role and user
- `Header` and `Footer` layout modules
- home, about, and contact `Page` records
- inline `HelloWorld` modules in the seeded page `_iterator`
- populated `Fields.link()` examples in header and footer modules
- `Author` and `Article`
- route settings and route maps for `/en/`, `/es/`, `/en/about/`, `/es/sobre/`,
  `/en/contact/`, and `/es/contacto/`

The seed is idempotent and also repairs the seeded home `_iterator` so
`HelloWorld` stays present after local database reuse.

## Custom API Operation

The preview defines `apiOperations` in `server/api-operations.ts` and passes it
to the Rakun bootstrap in `app/api/[[...rakun]]/route.ts`.

The seeded `HelloWorld` module is a client component with a button that calls
the public `demo.helloWorld` operation through the typed client:

```tsx
import {
  createRakunApiClient,
  type GetClient,
} from "@rakun-kit/next/web/client";
import type { apiOperations } from "../server/api-operations";

type PreviewApiClient = GetClient<typeof apiOperations>;

const apiClient: PreviewApiClient = createRakunApiClient<typeof apiOperations>({
  baseUrl: "/api",
});

const result = await apiClient.query("demo.helloWorld", { text });
```

## Rendering

The page route uses `RakunPageRenderer` from `@rakun-kit/next/web`:

```tsx
<RakunPageRenderer
  page={page}
  loadModule={(name) => import(`../../modules/${name}`)}
/>
```

Modules in `preview-next/modules` are server modules by default. Add
`"use client"` only to modules that need hooks or browser events.

## Build

```bash
bun run build
```
