import type { RakunBootstrapOptions, RakunBunConfig } from '@rakun-kit/bun'
import tailwindcss from '@tailwindcss/postcss'

import { Counter, LinkSection, Page, PageSection, previewManagerLanguages } from './src/rakun'

export const bootstrap: RakunBootstrapOptions = {
  literals: {
    'previewBun.counterLabel': {
      defaultMessage: 'Interactive island',
      description: 'Label shown beside the Bun preview client counter',
      usedBy: ['Counter'],
    },
    'previewBun.homeLink': {
      defaultMessage: 'Home page',
      description: 'Link from the Bun preview page to its home route',
      usedBy: ['NotFound', 'PageSection'],
    },
    'previewBun.managerLink': {
      defaultMessage: 'Manager',
      description: 'Link from the Bun preview page to the Rakun manager',
      usedBy: ['PageSection'],
    },
    'previewBun.navigationLabel': {
      defaultMessage: 'Preview routes',
      description: 'Accessible label for the Bun preview route links',
      usedBy: ['PageSection'],
    },
    'previewBun.notFoundTitle': {
      defaultMessage: 'Page not found',
      description: 'Heading shown for missing Bun preview routes',
      usedBy: ['NotFound'],
    },
  },
  internalContentTypes: {
    Page,
  },
  contentTypes: [PageSection, Counter, LinkSection],
  managerLanguages: previewManagerLanguages,
  routes: [
    {
      key: 'pages',
      contentType: Page.name,
      field: 'slug',
      hasPage: true,
      dynamic: false,
      defaultBasePath: '',
      layout: [{ type: 'content' }],
    },
  ],
  mongo: {
    MONGO_URI: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/rakun_preview_bun',
    ENVIRONMENT: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  },
  logger: {
    level: 'debug',
    prettify: true,
  },
}

const bunConfig: RakunBunConfig = {
  bootstrap,
  css: {
    plugins: [tailwindcss()],
  },
  modulesDir: './src/modules',
  revalidation: {
    token: process.env.RAKUN_REVALIDATE_TOKEN ?? 'preview-bun-token',
  },
  server: {
    port: Number(process.env.PORT ?? 4200),
  },
}

export default bunConfig
