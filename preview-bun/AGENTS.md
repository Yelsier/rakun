# AGENTS.md

`preview-bun` is a private, database-free consumer of `@rakun-kit/bun`.

- Keep it small and runnable without external services.
- Use filesystem modules under `src/modules`.
- Keep one static route and at least one dynamic route.
- Keep user-facing copy in the page literal record and pass resolved values to modules.
- Do not add manager or MongoDB setup here; use the larger previews for those flows.
- Verify with `bun run --filter @rakun-kit/preview-bun typecheck` and `build`.
