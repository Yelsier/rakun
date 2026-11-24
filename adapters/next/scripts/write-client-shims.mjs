import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(packageDir, 'dist')

// When a server entry is imported through a package subpath, Turbopack records
// its internal client references relative to dist/ instead of dist/esm/. Keep
// root-level runtime shims for those client boundaries.
const runtimeShims = [
  ['manager-client', 'RakunManagerClientPage'],
  ['web-dev-toolbar', 'RakunDevToolbar'],
  ['web-module-instrumentation', 'RakunModuleInstrumentation'],
]

await mkdir(distDir, { recursive: true })

await Promise.all(
  runtimeShims.map(([fileName, exportName]) =>
    writeFile(
      path.join(distDir, `${fileName}.js`),
      `export { ${exportName} } from './esm/${fileName}.js'\n`,
      'utf8'
    )
  )
)

await writeFile(
  path.join(distDir, 'manager-client.d.ts'),
  [
    "export type { RakunManagerClientPageProps } from './esm/manager-client.js'",
    "export { RakunManagerClientPage } from './esm/manager-client.js'",
    '',
  ].join('\n'),
  'utf8'
)
