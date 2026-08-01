# `@rakun-kit/openai` AI usage manual

Use this package to provide automatic CMS translation through the OpenAI API.
It implements core's translation service contract; it is unrelated to manager
UI locale packs.

## Install and configure

```sh
bun add @rakun-kit/openai
```

```ts
import { rakunBootstrap } from '@rakun-kit/core'
import { createOpenAITranslationServiceConfig } from '@rakun-kit/openai'

rakunBootstrap({
  // other options
  translation: createOpenAITranslationServiceConfig({
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_TRANSLATION_MODEL!,
  }),
})
```

Options are `apiKey`, `model`, `baseURL`, `organization` and `project`. Keep all
credentials in server-only modules. Set the model explicitly in production so
behavior does not change because of an environment default. Use `baseURL` only
for a compatible endpoint intentionally selected by the application.

The only public entrypoint is `@rakun-kit/openai`; it exports
`OpenAITranslationAdapter`, `createOpenAITranslationServiceConfig` and
`OpenAITranslationServiceConfig`.

This adapter translates content documents. Manager chrome translations belong
to `@rakun-kit/manager-locales`. Preserve core field translation rules and do
not send secrets or fields excluded by the translation contract in custom
wrappers.
