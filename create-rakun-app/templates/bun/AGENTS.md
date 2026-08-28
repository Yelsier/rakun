# Project instructions

Before changing Rakun code, read:

- `node_modules/@rakun-kit/core/dist/docs/index.md`
- `node_modules/@rakun-kit/bun/dist/docs/index.md`

This project runs entirely on Bun. Keep `rakun.config.ts` as the typed
framework configuration object and import global CSS directly from
`src/document.tsx`. Tailwind is configured through `css.plugins`; do not add a
separate CSS build script or generated stylesheet.

When changing content types or routes, review `src/rakun/content-types.ts`,
`rakun.config.ts`, the matching modules, and `seed.ts`. Keep server setup and
secrets outside client modules.
