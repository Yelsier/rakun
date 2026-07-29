import { watch, utimesSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const watchPaths = [
  path.join(rootDir, 'server/content-types.ts'),
  path.join(rootDir, 'server/bootstrap.ts'),
  path.join(rootDir, 'server/api-operations.ts'),
]
const reloadEntry = path.join(rootDir, 'app/api/[[...rakun]]/route.ts')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const touchRoute = () => {
  try {
    const now = new Date()
    utimesSync(reloadEntry, now, now)
    console.info(
      '[rakun] bootstrap source changed — reloading API route for content types',
    )
  } catch {
    // Route may not exist yet during boot.
  }
}

for (const file of watchPaths) {
  try {
    watch(file, { persistent: false }, () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      debounceTimer = setTimeout(touchRoute, 50)
    })
  } catch {
    // Ignore missing files during boot.
  }
}
