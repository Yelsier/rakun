# Bun preview

Small, database-free consumer of `@rakun-kit/bun`. It demonstrates a static
home page, dynamic routes, filesystem modules, client hydration, navigation,
and path revalidation.

From the repository root:

```sh
bun install
bun preview:bun
```

Open `http://localhost:4200`. The development revalidation token defaults to
`preview-bun-token` and can be replaced with `RAKUN_REVALIDATE_TOKEN`.

Production smoke test:

```sh
bun run --filter @rakun-kit/preview-bun build
bun run --filter @rakun-kit/preview-bun start
```
