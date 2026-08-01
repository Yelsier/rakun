# `@rakun-kit/manager-locales` AI usage manual

This package contains optional manager UI language packs. English is already
built into `@rakun-kit/manager-react`; install this package only for additional
languages.

## Install and register Spanish

```sh
bun add @rakun-kit/manager-locales
```

```ts
import { rakunBootstrap } from '@rakun-kit/core'
import { esManagerLocalePack } from '@rakun-kit/manager-locales/es'

rakunBootstrap({
  // other options
  managerLanguages: [esManagerLocalePack],
})
```

Import a language through its explicit subpath. There is no public root export.
Currently the public locale entrypoint is `@rakun-kit/manager-locales/es`.

## Project labels

Use `extendManagerLanguagePack` from `@rakun-kit/core/contracts` to add
project-specific keys to a complete pack. Define the corresponding English
project messages as a partial `managerLanguages` entry. Field labels use
`field.<fieldName>`; layout slots use `layoutModule.<layoutKey>`.

Project keys stay outside the static built-in `ManagerMessageKey` union. Do not
add application-specific copy to this package.

## Adding or updating a locale

When working in the Rakun repository, add `src/<code>.ts`, type its messages as
`ManagerLocalePack['messages']`, and declare a public subpath in `package.json`.
When built-in manager copy changes, increment `MANAGER_CATALOG_VERSION`, update
every complete locale, build `manager-react` first, then build this package.

Every language subpath is an independent entry so consumers bundle only what
they import. Do not import React manager runtime code into server bootstrap.
