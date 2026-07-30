import { watchRakunDevFiles } from '@rakun-kit/next/dev'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const registerRakunDevWatcher = () => {
  const rootDir = path.dirname(fileURLToPath(import.meta.url))

  watchRakunDevFiles({
    watch: [
      path.join(rootDir, 'server/content-types.ts'),
      path.join(rootDir, 'server/bootstrap.ts'),
      path.join(rootDir, 'server/api-operations.ts'),
    ],
    reloadEntries: [path.join(rootDir, 'app/api/[[...rakun]]/route.ts')],
  })
}
