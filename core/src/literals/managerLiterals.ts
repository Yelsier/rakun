import type { ManagerLiteralCatalogInput } from './manager'

export const managerLiteralCatalogInput = {
  'manager.common.contentTypes': {
    defaultMessage: `{count, plural, one {Content type} other {Content types}}`,
    translations: {
      es: `{count, plural, one {Tipo de contenido} other {Tipos de contenido}}`,
    },
    params: {
      count: 'number',
    },
  },
} as const satisfies ManagerLiteralCatalogInput
