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

Open `http://localhost:4200/`, `http://localhost:4200/about`, or
`http://localhost:4200/manager`. The seeded manager login is
`admin@example.com` / `admin123`. MongoDB defaults to
`mongodb://127.0.0.1:27017/rakun_preview_bun`.

The development revalidation token defaults to `preview-bun-token` and can be
replaced with `RAKUN_REVALIDATE_TOKEN`.

The preview uses Tailwind CSS v4 through the Bun framework CSS pipeline. Import
`src/styles.css` from `src/document.tsx`, configure the PostCSS plugin in
`rakun.config.ts`, and use utility classes anywhere under `src/`; development
rebuilds them automatically.

Production smoke test:

```sh
bun run --filter @rakun-kit/preview-bun build
bun run --filter @rakun-kit/preview-bun start
```
