import { createRakunDatabaseWeb } from '@rakun-kit/next/web'

import { createPreviewBootstrap } from './bootstrap'

export const previewWeb = createRakunDatabaseWeb({
  bootstrap: createPreviewBootstrap,
})
