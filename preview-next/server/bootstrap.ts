import { createLocalMediaServiceConfig, type RakunBootstrapOptions } from '@rakun-kit/next'

import { Footer, Header, PreviewPage, Project, previewContentTypes } from './content-types'
import { apiOperations } from './api-operations'
import { createOpenAITranslationServiceConfig } from '@rakun-kit/openai'
import { codeEditorPlugin } from '@rakun-kit/plugin-code-editor/server'

export const getPreviewMongoUri = () =>
  process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/rakun_preview'

export const createPreviewBootstrap = () =>
  ({
    plugins: [codeEditorPlugin],
    literals: {
      'test.hello': {
        defaultMessage: 'Hello, {name}!',
        description: 'A greeting message',
        usedBy: ['HelloWorld'],
        params: {
          name: 'string',
        },
      },
      'test.goodbye': {
        defaultMessage: 'Goodbye, {name}!',
        description: 'A farewell message',
        usedBy: ['HelloWorld'],
        params: {
          name: 'string',
        },
      },
      "demo.welcome": {
        defaultMessage: "Welcome to the demo!",
        description: "A welcome message for the demo",
        usedBy: ["Page"],
        params: {},
      },
    },
    contentTypes: previewContentTypes,
    internalContentTypes: {
      Page: PreviewPage,
    },
    routes: [
      {
        key: 'page',
        contentType: PreviewPage.name,
        field: 'slug',
        hasPage: true,
        dynamic: false,
        defaultBasePath: '',
        infoSchema: PreviewPage.getPopulatedSchema(),
        layout: [
          { type: 'module', key: 'header', contentType: Header.name },
          { type: 'content' },
          { type: 'module', key: 'footer', contentType: Footer.name },
        ],
      },
      {
        key: 'project',
        contentType: Project.name,
        field: 'slug',
        hasPage: true,
        dynamic: false,
        defaultBasePath: 'projects',
        infoSchema: Project.getPopulatedSchema(),
        layout: [
          { type: 'module', key: 'header', contentType: Header.name },
          { type: 'content' },
          { type: 'module', key: 'footer', contentType: Footer.name },
        ],
      },
    ],
    mongo: {
      MONGO_URI: getPreviewMongoUri(),
    },
    media: createLocalMediaServiceConfig({
      rootDir: '.',
      tokenSecret: 'super-secret-token',
      baseUrl: 'http://localhost:3000/api',
    }),
    translation: createOpenAITranslationServiceConfig({
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-5-mini',
    }),
    apiOperations,
    logger: {
      level: 'info',
      prettify: true,
      verbose: true,
    },
  }) satisfies RakunBootstrapOptions
