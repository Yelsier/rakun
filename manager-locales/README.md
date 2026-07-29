# @rakun-kit/manager-locales

Optional manager UI locale packs for Rakun. English remains built into
`@rakun-kit/manager-react`.

Install the package:

```sh
bun add @rakun-kit/manager-locales
# or: npm install @rakun-kit/manager-locales
```

Import only the locale needed by the server bootstrap:

```ts
import { esManagerLocalePack } from '@rakun-kit/manager-locales/es'

rakunBootstrap({
  // ...
  managerLanguages: [esManagerLocalePack],
})
```

Projects can extend a complete locale with their own content-type labels without
adding those keys to `ManagerMessageKey`:

```ts
import { extendManagerLanguagePack } from '@rakun-kit/core/contracts'
import { esManagerLocalePack } from '@rakun-kit/manager-locales/es'

const managerLanguages = [
  {
    code: 'en',
    name: 'English',
    messages: {
      'project.contentTypes.article.menu': 'Articles',
      'project.contentTypes.category.editorial': 'Editorial',
    },
  },
  extendManagerLanguagePack(esManagerLocalePack, {
    'project.contentTypes.article.menu': 'Artículos',
    'project.contentTypes.category.editorial': 'Editorial',
  }),
]
```

Use those arbitrary keys as the content type's `menu.title` and
`menu.category`. English project messages are merged with the manager's built-in
English catalog; other partial project packs retain English fallbacks.

Every language has an independent package export. Consumers therefore bundle
only imported locales:

- `@rakun-kit/manager-locales/es`

The npm tarball contains every available translation, but locale objects use
compact declarations and the package does not publish source maps.

## Adding a language

Add `src/<code>.ts`, declare the messages as
`ManagerLocalePack['messages']`, and add the corresponding subpath to
`package.json` exports. The explicit annotation keeps generated declarations
small while TypeScript still checks that every manager message is translated.

When manager copy adds, removes, or renames message keys, increment
`MANAGER_CATALOG_VERSION`, update every locale, and build `manager-react` before
building this package.
