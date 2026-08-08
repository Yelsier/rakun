import { createRakunRevalidateHandler } from '@rakun-kit/next/revalidate'

import { getRakunRevalidateToken } from '../../../server/web-config'

export const POST = createRakunRevalidateHandler({
  token: getRakunRevalidateToken(),
})
