# Project instructions

Before changing Rakun code, read:

- `node_modules/@rakun-kit/core/dist/docs/index.md`
- `node_modules/@rakun-kit/next/dist/docs/index.md`

This project uses the installed Next.js version. Before changing Next.js APIs or
conventions, read the relevant guide in `node_modules/next/dist/docs/` and heed
its deprecation notices.

Keep server configuration and secrets outside client components. When changing
content types or routes, review `server/content-types.ts`, `server/bootstrap.ts`,
the matching module, and both the API and page integrations.
