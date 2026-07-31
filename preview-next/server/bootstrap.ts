import {
  createGitHubLoginAdapter,
  createLocalMediaServiceConfig,
  type RakunBootstrapOptions,
} from '@rakun-kit/next'
import {
  Category,
  Footer,
  Header,
  PreviewPage,
  Project,
  previewContentTypes,
} from './content-types'
import { previewManagerLanguages } from './manager-locales'
import { apiOperations } from './api-operations'
import { createOpenAITranslationServiceConfig } from '@rakun-kit/openai'
import { createResendMailServiceConfig } from '@rakun-kit/resend'

export const getPreviewMongoUri = () =>
  process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/rakun_preview'

export const createPreviewBootstrap = () =>
  ({
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
      'demo.welcome': {
        defaultMessage: 'Welcome to the demo!',
        description: 'A welcome message for the demo',
        usedBy: ['Page'],
        params: {},
      },
    },
    contentTypes: previewContentTypes,
    managerLanguages: previewManagerLanguages,
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
      {
        key: 'category',
        contentType: Category.name,
        field: 'slug',
        hasPage: true,
        dynamic: false,
        defaultBasePath: 'categories',
        infoSchema: Category.getPopulatedSchema(),
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
    mail:
      process.env.RESEND_API_KEY?.trim() && process.env.RAKUN_MAIL_FROM?.trim()
        ? createResendMailServiceConfig({
            apiKey: process.env.RESEND_API_KEY,
            defaultFrom: process.env.RAKUN_MAIL_FROM,
          })
        : undefined,
    accountRecovery:
      process.env.RESEND_API_KEY?.trim() && process.env.RAKUN_MAIL_FROM?.trim()
        ? {
            passwordReset: {
              createUrl: (token) => {
                return `http://localhost:3000/backend/reset-password?token=${encodeURIComponent(token)}`
              },
            },
          }
        : undefined,
    apiOperations,
    login: {
      password: true,
      adapters: [
        createGitHubLoginAdapter({
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          redirectUri: 'http://localhost:3000/backend/login/callback',
        }),
      ],
    },
    logger: {
      level: 'info',
      prettify: true,
      verbose: true,
    },
  }) satisfies RakunBootstrapOptions
