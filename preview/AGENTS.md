# preview/AGENTS.md

## Role

`@rakun-kit/preview` is a local development app with Vite + React for the manager and an Express server for the Rakun API.

It is not a publishable package. It is used to test real integration between `core`, `express`, and `manager-react`.

## Commands

- Full app: `bun run preview`
- API only: `bun run preview:api`
- Web only: `bun run preview:web`
- From the package: `bun run dev`, `bun run dev:api`, `bun run dev:web`
- Typecheck: `bun run --filter @rakun-kit/preview typecheck`

## When Editing Preview

- Keep it as a test environment, not as a source of public APIs.
- If something is duplicated between preview and a real package, move the logic to the real package and keep preview as a consumer.
- Review `server` for bootstrap/content types/local data and `src` for manager mounting.
- Use it to validate manager/API flow changes when `core` unit tests are not enough.
