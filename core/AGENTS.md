# core/AGENTS.md

## Package Role

`@rakun-kit/core` is the source of truth for the Rakun domain: content types, fields, Zod schemas, manager/web operations, request context, MongoDB, auth, permissions, routes, redirects, media, translations, and shared contracts.

The core must not depend on React, Express, Next.js, Vite, or tRPC. Adapters translate framework requests into core operations.

## Important Areas

- `src/index.ts`: bootstrap, global initialization, and main public exports.
- `src/internal-content-types`: internal content types (`Page`, `Media`, `Route`, `Redirect`, `RobotsRule`, users, MFA, etc.).
- `src/lib/fields`: field factories and field behavior.
- `src/lib/ContentType.ts`: validation, schemas, and content type metadata.
- `src/api/operations`: operation contracts and definitions.
- `src/api/routes/manager`: manager operation implementations.
- `src/api/routes/web`: web endpoints such as page, robots, and sitemap.
- `src/api/utils/routes`: route resolution, route syncing, and route maps.
- `src/orm`: MongoDB, CRUD, migrations, versions, and backups.
- `src/media`: media service and optimization integration.
- `src/translation`: document translation and adapters.

## Internal Content Types

- Define them with `new ContentType({ ... })` and `Fields`.
- Export each type from `src/internal-content-types/index.ts`.
- If an internal content type should be usable externally, review `core/package.json` `exports`.
- If the content type appears in the manager, review permissions, list fields, uniques, and related screens in `manager-react`.
- If `Page`, `Route`, layouts, or document visibility change, also review `src/api/utils/routes` and web endpoints.

## Operations And Contracts

- Keep input/output validated with Zod and derive types from existing contracts.
- When adding or renaming an operation, review the registry/manifest in `src/api/operations` and manager clients.
- Application errors should use the existing error/logging system when applicable.
- When adding or changing an action, explicitly assess whether it is audit-relevant and belongs in the persistent event log. Record external side effects and meaningful lifecycle outcomes using the mail events (`mail.send.attempted`, `mail.send.succeeded`, and `mail.send.failed`) as the reference pattern; reserve `Logger` for diagnostic output.
- Every API error must produce a persistent `api.operation.failed` event for the manager Logs screen. Cover expected 4xx errors and unexpected 5xx failures, deduplicate errors that cross core and adapter boundaries, and never persist request payloads, credentials, sensitive causes, or raw internal error messages.
- All user-facing web/content text exposed by core must be declared through the Rakun literals catalog instead of being hardcoded.
- Auth and permission logic live in utilities such as `getUser`, `checkPermissions`, and `checkOwnership`; do not duplicate rules inline when a helper already exists.

## Tests

- Command: `bun run --filter @rakun-kit/core test`
- Existing tests use `bun test`.
- Tests exist in `src/orm`, `src/media`, `src/lib`, `src/translation`, and `src/api`.
- For routes/redirects/robots/sitemap changes, look for nearby tests in `src/api/utils/routes`, `src/api/utils/redirects`, and `src/api/routes/web`.
- For field or schema changes, add or adjust tests in `src/lib/fields` or near the affected behavior.

## Change Criteria

- Preserve persisted data compatibility unless a clear migration is implemented.
- Avoid changing `_type` names, field names, or public shapes without reviewing manager, adapters, and docs.
- Initialization uses a singleton (`ensureRakunInitialized`); preserve idempotency and retry behavior after errors.
- If a runtime dependency is added, decide whether it belongs in `dependencies` or `peerDependencies` based on whether core loads it directly.
