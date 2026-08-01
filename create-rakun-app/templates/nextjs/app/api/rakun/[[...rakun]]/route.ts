import { rakunNext } from '@rakun-kit/next'

import { createRakunBootstrap } from '@/server/bootstrap'

export const dynamic = 'force-dynamic'

export const { GET, POST, PUT } = rakunNext({
  bootstrap: createRakunBootstrap(),
})
