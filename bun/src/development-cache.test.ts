import { mkdir, mkdtemp, readdir, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { afterEach, expect, test } from 'bun:test'

import { buildRakunCode } from './build'
import { resolveRakunConfig } from './config'

const directories: string[] = []

afterEach(async () => {
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

test('reuses unchanged development browser builds and invalidates changed inputs', async () => {
  const root = await mkdtemp(resolve(import.meta.dir, '..', '.tmp-rakun-cache-'))
  directories.push(root)
  const modulesDir = resolve(root, 'src', 'modules')
  const moduleFile = resolve(modulesDir, 'Counter.tsx')
  await mkdir(modulesDir, { recursive: true })
  await writeFile(
    moduleFile,
    `'use client'\nexport default function Counter() { return <button>First</button> }`
  )
  const config = resolveRakunConfig({
    manager: false,
    rootDir: root,
    server: { development: true },
  })

  const first = await buildRakunCode(config)
  const navigationFile = resolve(root, 'dist', first.manifest.navigation.slice(1))
  const serverDir = resolve(root, 'dist', 'server')
  const firstServerName = (await readdir(serverDir)).find((path) => path.endsWith('.js'))
  if (!firstServerName) throw new Error('Expected a development server artifact.')
  const firstServerFile = resolve(serverDir, firstServerName)
  const oldTime = new Date('2000-01-01T00:00:00.000Z')
  await Promise.all([
    utimes(navigationFile, oldTime, oldTime),
    utimes(firstServerFile, oldTime, oldTime),
  ])

  const second = await buildRakunCode(config)
  expect(second.manifest.navigation).toBe(first.manifest.navigation)
  expect((await stat(navigationFile)).mtime.getUTCFullYear()).toBe(2000)
  expect((await stat(firstServerFile)).mtime.getUTCFullYear()).toBe(2000)

  await rm(resolve(root, 'dist'), { recursive: true, force: true })
  const restored = await buildRakunCode(config)
  expect(restored.manifest.navigation).toBe(first.manifest.navigation)
  expect((await stat(navigationFile)).isFile()).toBe(true)
  expect((await stat(firstServerFile)).isFile()).toBe(true)

  await writeFile(
    moduleFile,
    `'use client'\nexport default function Counter() { return <button>Second</button> }`
  )
  const incremental = await buildRakunCode(config, {
    client: ['Counter'],
    previousManifest: restored.manifest,
  })
  expect(incremental.manifest.client.Counter?.chunk).not.toBe(first.manifest.client.Counter?.chunk)
  const incrementalServerName = (await readdir(serverDir)).find(
    (path) => path.endsWith('.js') && path !== firstServerName
  )
  if (!incrementalServerName) throw new Error('Expected a rebuilt development server artifact.')
  const incrementalServerFile = resolve(serverDir, incrementalServerName)
  await Promise.all([
    utimes(navigationFile, oldTime, oldTime),
    utimes(incrementalServerFile, oldTime, oldTime),
  ])

  const restarted = await buildRakunCode(config)
  expect(restarted.manifest.client.Counter?.chunk).toBe(incremental.manifest.client.Counter?.chunk)
  expect((await stat(navigationFile)).mtime.getUTCFullYear()).toBe(2000)
  expect((await stat(incrementalServerFile)).mtime.getUTCFullYear()).toBe(2000)
}, 10_000)
