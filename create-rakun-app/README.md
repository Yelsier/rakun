# create-rakun-app

Scaffold a Rakun project from an official starter template.

```sh
npx create-rakun-app@latest my-site --template nextjs
```

or with Bun:

```sh
bunx create-rakun-app@latest my-site --template bun
```

If `--template` is omitted, the CLI asks which framework to use. Next.js is the
default choice; Bun is also available. `next` is an alias for `nextjs`, and
`bunjs` is an alias for `bun`.

When creating the project, the CLI queries the npm registry for the latest
packages used by the selected template and writes exact numeric versions into
the generated `package.json`. Supporting build and runtime packages are also
pinned exactly, while version resolution keeps TypeScript and native packages
on the compatible release lines validated by the template. Each starter contains
a minimal content model, manager, MongoDB config, and administrator seed
command. The Next.js starter also mounts `/llms.txt`; the route remains a 404
until an editor enables and curates it from Manager Settings.

## Options

```txt
create-rakun-app [project-directory] [options]

-t, --template <name>       Starter template
    --package-manager <pm>  npm, pnpm, yarn, or bun
    --no-install            Skip dependency installation
-h, --help                  Show help
-v, --version               Show the installed version
```

The CLI refuses to write into a non-empty target directory. It creates
`.env.local` from `.env.example`; review those local credentials before running:

```sh
npm run seed
npm run dev
```

## Build and test

```sh
bun run --filter create-rakun-app build
bun run --filter create-rakun-app test
```
