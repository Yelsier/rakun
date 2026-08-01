# `create-rakun-app` AI usage manual

Use this package to scaffold an application from a maintained Rakun template.
It is a project generator, not a runtime dependency.

## Next.js template

```sh
npx create-rakun-app@latest my-site --template nextjs
```

`next` is an alias for `nextjs`. Without `--template`, an interactive terminal
prompts for a framework and lists Next.js first. Without a project directory it
also prompts for one, defaulting to `my-rakun-app`.

At creation time, the CLI reads npm's `latest` metadata for Next.js, React, and
each Rakun package, then writes exact numeric versions to the generated
`package.json`. It never leaves `latest` or unresolved placeholders in the
project. Supporting tools are also pinned to exact versions; TypeScript and
native dependencies resolve within template-tested release lines so that an
unrelated future major cannot silently break a new app.

Version resolution happens before the destination is created. If npm is
unreachable or returns invalid metadata, the CLI stops with an error instead of
writing a partially versioned project. After installation, use the exact
installed manuals and APIs; do not assume they match the generator repository's
workspace versions.

## Generated architecture

- `server/content-types.ts` defines a minimal `Page` and `Hero` with `f.*`.
- `server/bootstrap.ts` configures MongoDB and one page route. Rakun's built-in
  password login uses its default behavior.
- `app/api/rakun/[[...rakun]]/route.ts` mounts `rakunNext`.
- `app/backend/[[...slug]]/page.tsx` mounts the manager at `/backend`.
- `app/[[...slug]]/page.tsx` resolves and renders public Rakun pages.
- `modules/` contains the matching React page modules and fallbacks.
- `server/seed.ts` creates or updates the initial administrator from local env.
- `AGENTS.md` points agents to the installed Rakun and Next.js manuals.

The generated package is ESM (`"type": "module"`). Keep that setting because
the TypeScript seed script uses top-level `await` and server modules use ESM
imports.

The CLI creates `.env.local` from `.env.example`. The app requires a reachable
MongoDB database. Run the seed before signing into the manager.

## Automation and safety

Use `--no-install` when another process owns dependency installation or when
testing the generated files. Select a package manager explicitly with
`--package-manager npm|pnpm|yarn|bun`; otherwise the CLI infers it from the
invoking tool and falls back to npm.

The destination may be new or already empty. The CLI refuses a non-empty
directory and never deletes existing project content.

When adding a template, keep template selection data-driven, document the new
identifier and aliases, include an installed `AGENTS.md`, and add scaffold tests
that verify key files and dependency policy. Keep generated configuration
minimal and prefer public Rakun package entrypoints.
