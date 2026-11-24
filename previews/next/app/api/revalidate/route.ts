import { createRakunRevalidateHandler } from '@rakun-kit/next/revalidate'

import { getPreviewRevalidateToken } from '../../../server/web-config'

export const POST = createRakunRevalidateHandler({
  token: getPreviewRevalidateToken(),
})
