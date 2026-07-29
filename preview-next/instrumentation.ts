export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  if (process.env.NODE_ENV === 'production') {
    return
  }

  const [{ watchRakunDevFiles }, path, { fileURLToPath }] = await Promise.all([
    import('@rakun-kit/next/dev'),
    import('node:path'),
    import('node:url'),
  ])

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
