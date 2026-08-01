# create-rakun-app

Scaffold a Rakun project from an official starter template.

```sh
npx create-rakun-app@latest my-site --template nextjs
```

or with Bun:

```sh
bunx create-rakun-app@latest my-site --template nextjs
```

If `--template` is omitted, the CLI asks which framework to use. Next.js is the
first and currently the only choice. Both `nextjs` and `next` are accepted as
template names.

When creating the project, the CLI queries the npm registry for the newest
Next.js, React, and Rakun releases and writes their exact numeric versions into
the generated `package.json`. Supporting build and runtime packages are also
pinned exactly, while version resolution keeps TypeScript and native packages
on the compatible release lines validated by the template. The starter contains
a minimal content model, API route, manager, web renderer, MongoDB config, and
administrator seed command.

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
