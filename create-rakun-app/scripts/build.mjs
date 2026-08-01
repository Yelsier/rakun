import { chmod, cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'

const packageRoot = process.cwd()
const dist = path.join(packageRoot, 'dist')

await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await cp(path.join(packageRoot, 'src', 'index.js'), path.join(dist, 'index.js'))
await cp(path.join(packageRoot, 'templates'), path.join(dist, 'templates'), {
  recursive: true,
})
await chmod(path.join(dist, 'index.js'), 0o755)
