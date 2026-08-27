# Bun preview

Small MongoDB-backed consumer of `@rakun-kit/bun`. It uses the real Rakun
bootstrap and demonstrates a static CMS route, manager, API, filesystem
modules, the `src/document.tsx` convention, client hydration, navigation, and
path revalidation.

From the repository root:

```sh
bun install
bun preview:bun:seed
bun preview:bun
```

Open `http://localhost:4200/en/` or `http://localhost:4200/manager`. The seeded
manager login is `admin@example.com` / `admin123`. MongoDB defaults to
`mongodb://127.0.0.1:27017/rakun_preview_bun`.

The development revalidation token defaults to `preview-bun-token` and can be
replaced with `RAKUN_REVALIDATE_TOKEN`.

Production smoke test:

```sh
bun run --filter @rakun-kit/preview-bun build
bun run --filter @rakun-kit/preview-bun start
```
