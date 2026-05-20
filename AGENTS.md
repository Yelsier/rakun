# AGENTS.md

## Project

Rakun is a Bun/TypeScript monorepo for building small and medium CMS projects without coupling the core to a specific framework.

Main packages:

- `core`: shared domain logic, content types, fields, schemas, manager/web operations, auth, permissions, media, routes, redirects, translations, MongoDB, and contracts.
- `manager-react`: React manager app, clients, internal routing, UI components, and packaged styles.
- `express`: Express adapter for APIs, local media, and optional tRPC.
- `next`: Next.js App Router adapter for APIs, media, manager, and web rendering.
- `trpc`: tRPC router built on top of Rakun operations.
- `react`: React helpers for rendering web modules.
- `s3`: S3 media storage adapter.
- `openai`: automatic translation adapter using OpenAI.
- `preview`: local Vite + Express development app.
- `preview-next`: local Next.js app; it has its own `AGENTS.md`.

## Commands

- Install dependencies: `bun install`
- Main test command: `bun run test` or `bun run --filter @rakun-kit/core test`
- Build everything: `bun run build`
- Build one package: `bun run build:core`, `bun run build:manager-react`, etc.
- Vite/Express preview: `bun run preview`, `bun run preview:api`, `bun run preview:web`
- Next preview: `bun run preview:next`

## Style

- Strict TypeScript, ESM, and type-only imports with `import type`.
- Prettier through ESLint: no semicolons, single quotes, ES5 trailing commas.
- Follow nearby file style when older files differ.
- Prefer existing APIs and helpers before adding new abstractions.
- Keep changes small and localized; do not edit `dist`, `node_modules`, or generated outputs.
- Published packages emit `dist/esm` and `dist/cjs`; if a public entry is added, review `package.json` `exports`.

## Recommended AI Workflow

- Start with `rg`/`rg --files` to find nearby patterns.
- Read the package `README.md` before changing a public API.
- If a change touches core-manager contracts, review both sides: `core/src/api/operations`, `core/src/schemas`, `manager-react/src/client`, and the affected screens.
- If a change touches web routes, review `core/src/api/utils/routes`, `core/src/api/routes/web`, and adapters (`next`, `express`) when relevant.
- If a change touches media, review `core/src/media`, `manager-react/src/components/media`, `express/src/media.ts`, `next/src/media.ts`, and `s3/src`.
- Run the smallest test/build that covers the change; expand to `bun run build` when exports, shared types, or contracts change.

## Common Traps

- `manager-react/tsconfig.json` points to `.d.ts` files in `core/dist/esm`; if `core` changes and the manager cannot see new types, build `core`.
- The core must stay agnostic of Express, Next, Vite, and React.
- `preview-next` uses a modern Next.js version with its own rules; read `preview-next/AGENTS.md` before editing that app.
- Do not assume a manager operation is frontend-only: it usually has a core contract/schema and manager consumer.
