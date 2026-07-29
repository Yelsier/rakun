import { rakunNext } from '@rakun-kit/next'

import { createPreviewBootstrap } from '../../../server/bootstrap'

export const dynamic = 'force-dynamic'

export const { GET, POST, PUT } = rakunNext({
  bootstrap: () => createPreviewBootstrap(),
})
