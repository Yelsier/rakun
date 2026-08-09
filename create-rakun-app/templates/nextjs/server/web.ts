import { createRakunDatabaseWeb } from '@rakun-kit/next/web'

import { createRakunBootstrap } from './bootstrap'

export const rakunWeb = createRakunDatabaseWeb({
  bootstrap: createRakunBootstrap,
})
