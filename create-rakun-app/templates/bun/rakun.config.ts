import tailwindcss from '@tailwindcss/postcss'
import type { RakunBootstrapOptions, RakunBunConfig } from '@rakun-kit/bun'

import { Counter, Hero, Page } from './src/rakun'

const mongoUri = process.env.MONGO_URI?.trim()
if (!mongoUri) throw new Error('MONGO_URI is required')

export const bootstrap = {
  literals: {
    'starter.counter.label': {
      defaultMessage: 'Interactive island',
      description: 'Label displayed beside the interactive counter',
      usedBy: ['Counter'],
    },
    'starter.notFound.title': {
      defaultMessage: 'Page not found',
      description: 'Title displayed for an unresolved public route',
      usedBy: ['NotFound'],
    },
  },
  contentTypes: [Hero, Counter],
  internalContentTypes: {
    Page,
  },
  routes: [
    {
      key: 'page',
      contentType: Page.name,
      field: 'slug',
      hasPage: true,
      dynamic: false,
      defaultBasePath: '',
      layout: [{ type: 'content' }],
    },
  ],
  mongo: {
    MONGO_URI: mongoUri,
    ENVIRONMENT: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  },
  logger: {
    level: 'info',
    prettify: process.env.NODE_ENV !== 'production',
  },
} satisfies RakunBootstrapOptions

const bunConfig: RakunBunConfig = {
  bootstrap,
  css: {
    plugins: [tailwindcss()],
  },
  revalidation: {
    token: process.env.RAKUN_REVALIDATE_TOKEN?.trim() || 'change-me-before-production',
  },
  server: {
    port: Number(process.env.PORT ?? 3000),
  },
}

export default bunConfig
