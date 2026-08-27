# AGENTS.md

## Project

Rakun is a Bun/TypeScript monorepo for building small and medium CMS projects without coupling the core to a specific framework.

Main packages:

- `core`: shared domain logic, content types, fields, schemas, manager/web operations, auth, permissions, media, routes, redirects, translations, MongoDB, and contracts.
- `manager-react`: React manager app, clients, internal routing, UI components, and packaged styles.
- `manager-locales`: optional manager UI locale packs with one public subpath per language.
- `express`: Express adapter for APIs, local media, and optional tRPC.
- `bun`: Bun 1.4 framework for API, manager, filesystem modules, SSR, client
  boundaries, static generation, and path-based route cache regeneration.
- `next`: Next.js App Router adapter for APIs, media, manager, and web rendering.
- `trpc`: tRPC router built on top of Rakun operations.
- `react`: React helpers for rendering web modules.
- `s3`: S3 media storage adapter.
- `smtp`: SMTP mail adapter.
- `resend`: Resend mail adapter.
- `jsx-email`: JSX Email template renderer.
- `openai`: automatic translation adapter using OpenAI.
- `plugin-code-editor`: manager plugin for code blocks in RichText fields.
- `preview`: local Vite + Express development app.
- `preview-bun`: small MongoDB-backed Bun framework preview.
- `preview-next`: local Next.js app; it has its own `AGENTS.md`.
- `create-rakun-app`: project generator with official starter templates; its
  Next.js template is kept intentionally smaller than `preview-next`.

## Commands

- Install dependencies: `bun install`
- Main test command: `bun run test` or `bun run --filter @rakun-kit/core test`
- Build everything: `bun run build`
- Build one package: `bun run build:core`, `bun run build:manager-react`, etc.
- Build Bun framework: `bun run build:bun`
- Build manager locales: `bun run build:manager-locales`
- Build the project generator: `bun run build:create-rakun-app`
- Vite/Express preview: `bun run preview`, `bun run preview:api`, `bun run preview:web`
- Bun preview: `bun run preview:bun`
- Seed Bun preview: `bun run preview:bun:seed`
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
- Read `core/docs/index.md` for the package map and the affected package's `docs/index.md` before changing how consumers use Rakun. Read its `README.md` as well before changing a public API.
- For every change, assess whether it affects how a consumer or coding agent installs, imports, configures, combines, or operates a published package. When it does, update that package's `docs/index.md` in the same change. If package availability, responsibilities, or relationships change, also update `core/docs/index.md`, which is the installed documentation index. Do not postpone documentation updates to a later change.
- Keep AI manuals accurate against public exports and supported behavior. Package builds copy `docs/` to `dist/docs/`; edit the source manuals only, never generated `dist` files.
- For every new or changed action, use judgment to decide whether it must be recorded in the persistent event log. Audit-relevant operations, external side effects, and important lifecycle transitions should be logged with enough outcome context; mail delivery (`attempted`, `succeeded`, and `failed`) is the reference pattern. Do not confuse persistent business events with diagnostic `Logger` output.
- Every API error must be recorded in the persistent event log displayed by the manager, including expected 4xx application errors and unexpected 5xx failures. Never persist request payloads, credentials, sensitive causes, or raw internal error messages.
- Successful API mutations are logged automatically with an operation-specific `<operation>.succeeded` event. Add explicit domain events as well when an action has meaningful phases or outcomes that the generic mutation event cannot express; do not log successful read-only queries by default.
- Never hardcode user-facing copy. Web/content-facing text must be declared as Rakun literals; manager UI text must use the manager translation catalog and static translation keys.
- If a change touches core-manager contracts, review both sides: `core/src/api/operations`, `core/src/schemas`, `manager-react/src/client`, and the affected screens.
- If a change touches web routes, review `core/src/api/utils/routes`, `core/src/api/routes/web`, and adapters (`next`, `express`) when relevant.
- If a change touches media, review `core/src/media`, `manager-react/src/components/media`, `express/src/media.ts`, `next/src/media.ts`, and `s3/src`.
- Run the smallest test/build that covers the change; expand to `bun run build` when exports, shared types, or contracts change.

### Thematic Stack Validation

- When using `$thematic-stacked-prs` to split an original/global feature branch into `feature-*` branches, run the relevant tests once on the original source tip that contains the complete cumulative change before extracting the thematic branches.
- Do not run builds, typechecks, or test suites on each generated `feature-*` branch. Per-layer validation is limited to inspecting `<parent>...<branch>`, running `git diff --check <parent>...<branch>`, and reconciling hunk ownership.
- This exception overrides package-level build and verification instructions in nested `AGENTS.md` files for the generated thematic branches. Only perform branch-specific builds or tests when the user explicitly requests them.

## Common Traps

- `manager-react/tsconfig.json` points to `.d.ts` files in `core/dist/esm`; if `core` changes and the manager cannot see new types, build `core`.
- The core must stay agnostic of Express, Next, Vite, and React.
- `preview-next` uses a modern Next.js version with its own rules; read `preview-next/AGENTS.md` before editing that app.
- Do not assume a manager operation is frontend-only: it usually has a core contract/schema and manager consumer.
