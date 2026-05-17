# @rakun-kit/openai

OpenAI translation adapter for Rakun automatic CMS translations.

## Usage

```ts
import { rakunBootstrap } from "@rakun-kit/core";
import { createOpenAITranslationServiceConfig } from "@rakun-kit/openai";

rakunBootstrap({
  // ...
  translation: createOpenAITranslationServiceConfig({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-5.4-mini",
  }),
});
```

## Options

```ts
type OpenAITranslationServiceConfig = {
  apiKey?: string;
  model?: string;
  baseURL?: string;
  organization?: string;
  project?: string;
};
```

## Exports

- `OpenAITranslationAdapter`
- `createOpenAITranslationServiceConfig`
- `OpenAITranslationServiceConfig`
