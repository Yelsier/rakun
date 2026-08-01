import { cp, mkdir } from 'node:fs/promises'
import path from 'node:path'

const packageRoot = process.cwd()
const source = path.join(packageRoot, 'docs')
const destination = path.join(packageRoot, 'dist', 'docs')

await mkdir(path.dirname(destination), { recursive: true })
await cp(source, destination, { recursive: true, force: true })
