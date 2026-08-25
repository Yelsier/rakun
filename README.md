# Rakun

Rakun is a TypeScript toolkit for building small and medium CMS projects quickly
without locking the application into one framework.

The idea is simple: describe your content model once, bootstrap Rakun with the
runtime services you want, and expose the manager/API through whatever adapter
fits your app. Rakun ships with adapters for Bun, Express, and Next.js, plus a React
manager UI, but the core is intentionally open enough for other adapters to be
built around it.

## Why Rakun

Many CMS tools are either very tied to one framework or require a large amount
of setup before the first useful screen exists. Rakun tries to sit in a smaller
space:

- define content types with code
- get manager CRUD screens from those definitions
- keep routing, pages, layout modules, media, redirects, auth and permissions in
  shared core logic
- choose the HTTP/runtime layer yourself
- keep enough low-level APIs public so custom integrations are possible

At the moment the project focuses on MongoDB-backed content and a React manager,
with Bun, Express, and Next.js integrations available.

## Packages

| Package                         | Purpose                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `@rakun-kit/core`               | Content types, fields, schemas, runtime bootstrap, operations, auth, media, event logs, routes, redirects and shared contracts. |
| `@rakun-kit/manager-react`      | React manager application, manager clients, navigation helpers and styles.                                                      |
| `@rakun-kit/manager-locales`    | Optional manager UI translations exposed through one subpath per language.                                                      |
| `@rakun-kit/express`            | Express adapter for Rakun APIs, media routes and optional tRPC support.                                                         |
| `@rakun-kit/bun`                | Bun framework for one-process API, manager, filesystem modules, SSR and static routes.                                          |
| `@rakun-kit/next`               | Next.js adapter for APIs, media routes and mounting the manager.                                                                |
| `@rakun-kit/trpc`               | tRPC router adapter for Rakun operations.                                                                                       |
| `@rakun-kit/react`              | Framework-neutral React helpers for rendering Rakun web modules.                                                                |
| `@rakun-kit/s3`                 | S3 media storage adapter.                                                                                                       |
| `@rakun-kit/smtp`               | Nodemailer SMTP adapter for outbound mail.                                                                                      |
| `@rakun-kit/resend`             | Resend adapter for outbound mail.                                                                                               |
| `@rakun-kit/jsx-email`          | ESM JSX Email renderer for typed React mail templates.                                                                          |
| `@rakun-kit/openai`             | OpenAI automatic translation adapter.                                                                                           |
| `@rakun-kit/plugin-code-editor` | Manager plugin for code blocks in RichText fields.                                                                              |
| `create-rakun-app`              | CLI that scaffolds Rakun applications from maintained framework templates.                                                      |
| `@rakun-kit/preview`            | Local development app, not intended for publication.                                                                            |

## AI Documentation

Every published package ships an AI-oriented manual at `dist/docs/index.md`.
Start with the package map in
`node_modules/@rakun-kit/core/dist/docs/index.md`, then read the manual for each
adapter or integration used by the application.

Projects can make this discoverable to coding agents with a rule like this in
their `AGENTS.md`:

```md
Before writing or changing Rakun code, read
`node_modules/@rakun-kit/core/dist/docs/index.md` and the installed manual for
each Rakun package involved in the change.
```

## Create an app

Start a minimal Next.js project with the official generator:

```sh
npx create-rakun-app@latest my-site --template nextjs
```

Omit `--template` to choose a framework interactively. The generator resolves
the newest Next.js, React, and Rakun releases from npm, then records their exact
numeric versions in the new project's `package.json`.

## Basic Shape

Define content types in application code:

```ts
import { ContentType, f } from '@rakun-kit/core'

export const Post = new ContentType({
  name: 'Post',
  menu: {
    title: 'Posts',
    icon: 'newspaper',
    category: 'Content',
  },
  fields: {
    title: f.string().required(),
    slug: f.string().type('Slug').required(),
    body: f.string().type('RichText'),
    published: f.boolean(),
  },
  uniques: [['slug']],
  listFields: ['title', 'slug', 'published'],
})
```

Bootstrap Rakun once in your server/runtime:

```ts
import { rakunBootstrap } from '@rakun-kit/core'

rakunBootstrap({
  literals: {},
  contentTypes: [Post],
  mongo: {
    MONGO_URI: process.env.MONGO_URI!,
    ENVIRONMENT: 'production',
  },
})
```

Then expose the runtime through an adapter. With Express:

```ts
import express from 'express'
import { rakunExpress } from '@rakun-kit/express'

const app = express()

app.use('/api/rakun', rakunExpress())
app.listen(3000)
```

## Framework Agnostic By Design

Rakun does not want the core CMS logic to depend on Express, Next.js, Vite or a
specific router. The core package owns the content model and operations. Adapters
are thin layers that translate a framework request into Rakun operations and
return a framework response.

That means a new adapter can be created by reusing:

- `@rakun-kit/core` for bootstrap and operation handling
- `@rakun-kit/manager-react` for the manager UI
- `@rakun-kit/manager-react/client/request` for custom manager clients
- `@rakun-kit/trpc` if the target platform already uses tRPC

Current integrations cover Express and Next.js. The preview app uses Vite for
local manager development, but Vite is not a required runtime target.

## Manager UI

`@rakun-kit/manager-react` provides the manager as a React app. Framework adapters can
mount it directly, or a custom integration can provide:

- a manager client
- navigation helpers
- the current pathname/base path
- the bundled stylesheet

```tsx
import { ManagerBrowserApp, createHttpManagerClient } from '@rakun-kit/manager-react'
import '@rakun-kit/manager-react/styles.css'

const client = createHttpManagerClient({
  baseUrl: '/api/rakun',
})

export function ManagerPage() {
  return (
    <ManagerBrowserApp client={client} pathname={window.location.pathname} basePath="/manager" />
  )
}
```

English is included in the manager. Extra UI languages are provided by a
separate package:

```sh
bun add @rakun-kit/manager-locales
```

Import a language through its subpath, such as
`@rakun-kit/manager-locales/es`, and register it through `managerLanguages` in
`rakunBootstrap`.

## Development

Install dependencies:

```sh
bun install
```

Build all published packages:

```sh
bun build
```

Run the seeding if you want some base info:

```sh
bun preview:next:seed
```

Run the local preview app:

```sh
bun preview
```

or

```sh
bun preview:next
```

For a comprehensive list of commands check the root `package.json`.

## License

Rakun is released under the MIT license. See `LICENSE` and
`THIRD_PARTY_NOTICES.md`.

## Disclaimer

Rakun is still very much a work in progress. APIs, package boundaries and
manager workflows may change while the project takes shape.

Some features have been implemented with AI assistance. The goal is still to
keep the code understandable, reviewed and maintainable, but users should expect
rough edges and verify behavior before using Rakun in production.
