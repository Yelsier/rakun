import type { RakunBootstrapOptions } from '@rakun-kit/core'

import { Hero, Page } from './content-types'
import { getRakunRevalidateToken, getRakunRevalidateUrl } from './web-config'

export const getMongoUri = () => {
  const mongoUri = process.env.MONGO_URI?.trim()
  if (!mongoUri) throw new Error('MONGO_URI is required')
  return mongoUri
}

export const createRakunBootstrap = () =>
  ({
    literals: {},
    contentTypes: [Hero],
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
        infoSchema: Page.getPopulatedSchema(),
      },
    ],
    mongo: {
      MONGO_URI: getMongoUri(),
    },
    logger: {
      level: 'info',
      prettify: process.env.NODE_ENV !== 'production',
    },
    revalidate: {
      url: getRakunRevalidateUrl(),
      token: getRakunRevalidateToken(),
    },
  }) satisfies RakunBootstrapOptions
