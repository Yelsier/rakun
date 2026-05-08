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
npm run dev
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
- home `Page`
- inline `HelloWorld` module in the home iterator
- `Author` and `Article`
- route settings and route map for `/en`

The seed is idempotent and also repairs the seeded home iterator so
`HelloWorld` stays present after local database reuse.

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
npm run build
```
