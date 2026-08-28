# AGENTS.md

`preview-bun` is a private MongoDB-backed consumer of `@rakun-kit/bun`.

- Keep it small and use the real Rakun bootstrap contracts.
- Use filesystem modules under `src/modules`.
- Keep the application shell in the server-only `src/document.tsx` convention.
- Keep one seeded static route.
- Keep user-facing copy in the page literal record and pass resolved values to modules.
- Keep manager and MongoDB setup minimal.
- Verify with `bun run --filter @rakun-kit/preview-bun typecheck` and `build`.
