# manager-react/AGENTS.md

## Package Role

`@rakun-kit/manager-react` contains the publishable React manager: runtime app, manager client, internal routing, dashboard/login/MFA screens, UI components, media library, editor, state, and styles.

It must remain usable from external adapters. Do not assume it always runs inside Next.js or Vite.

## Important Areas

- `src/index.ts`: public package exports.
- `src/app` and `src/router/app.tsx`: manager app mounting.
- `src/router/shared`: internal route definitions, parsing, and rendering.
- `src/router/dashboard`: dashboard screens, content type CRUD, and settings.
- `src/client`: HTTP/tRPC/request clients and React hooks.
- `src/state`: navigation, session, language, and theme.
- `src/components/ui`: base components.
- `src/components/media`: media library, previews, upload, folders, and dialogs.
- `src/router/dashboard/[contentType]/[edit]/_fields`: field-specific UIs.
- `src/styles/globals.css`: global styles; `scripts/build-css.mjs` packages CSS.

## Manager Routing

- New screens usually need `index.ts`, `screen.tsx`, and an entry in `src/router/shared/route-list.tsx`.
- Review `route-schema.ts`, `route-definitions.tsx`, and `route-renderer.tsx` before changing route shapes.
- Preserve support for `basePath`, `pathname`, and injectable navigation.

## UI And State

- Use existing components from `src/components/ui` before creating new ones.
- Use `useManagerQuery` and `useManagerMutation` for manager operations.
- Built-in manager UI copy must use `useTranslations()` with descriptive static keys (e.g. `sidebar.settings`, `navUser.account`). Add English defaults in `src/i18n/catalog.ts` and the same keys in every complete locale pack.
- Host apps install extra manager UI locales from language-specific exports such as `@rakun-kit/manager-locales/es` and pass them through `managerLanguages` on `rakunBootstrap` (English is always built into the manager client). Do not import the main `@rakun-kit/manager-react` entry from server bootstrap code — it pulls React into API routes.
- The manager loads packs at runtime through the public `manager.uiLocales` operation.
- Content editing locale (`useLanguage`) is separate from manager UI locale (`useManagerI18n`).
- Host-defined content-type `menu.title` / `menu.category` may use arbitrary project message keys. Register those keys per locale through `managerLanguages`; do not add host or preview keys to the built-in catalog. `t()` falls back to the raw string when no key exists.
- Host-defined field labels use the dynamic `field.<fieldName>` namespace and remain outside the built-in catalog.
- Route layout slot labels use the dynamic `layoutModule.<layoutKey>` namespace and remain outside the built-in catalog.
- Avoid concentrating unrelated behavior in one file; keep components, hooks, utilities, and state boundaries focused on a single responsibility.
- Use local/context providers for shared screen state when it prevents prop drilling.
- Show loading, empty, and error states when a screen needs them.
- Respect permissions through `useSession().hasPermissions(...)` and show `UnauthorizedMessage` when applicable.
- Use confirmation dialogs for destructive actions and `toast` for feedback.
- Use `lucide-react` icons when a suitable icon exists.
- Keep manager screens dense, clear, and functional; avoid landing-page composition.

## Forms

- Common pattern: `react-hook-form` + `zodResolver` + `Form` components.
- Sanitize payloads before sending (`trim`, `undefined` for optional empty values, explicit numeric casts).
- Reuse core schemas/types when they already exist in client contracts.

## Styles

- Tailwind in `className`; prefer existing tokens/components.
- Do not add global styles unless they are genuinely shared.
- After CSS changes, run `bun run -F @rakun-kit/manager-react build:css`.
- If exported styles change, verify with `bun run --filter @rakun-kit/manager-react build` to regenerate CSS.

## Build And Verification

- Package build: `bun run --filter @rakun-kit/manager-react build`
- If core types changed, build core first: `bun run build:core`.
- For visual testing, use `bun run preview` or the `preview-next` app depending on the affected flow.

## Common Traps

- `manager-react` consumes types from `core/dist/esm` through TS paths; recent core changes may not appear until core is built.
- Settings screens are often backed by internal content types and core operations.
- Avoid coupling public components to preview-specific absolute routes.
