import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, expect, test } from 'bun:test'

import { RakunRouteCache } from './cache'
import type { RenderedRoute } from './types'

const directories: string[] = []

const makeDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'rakun-bun-cache-'))
  directories.push(directory)
  return directory
}

afterEach(async () => {
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

const route = (path: string, value: string): RenderedRoute => ({
  path,
  html: value,
  flight: {
    assets: { clientModules: [], scripts: [], styles: [] },
    head: '',
    html: value,
    path,
  },
})

test('keeps current route when regeneration fails', async () => {
  const directory = await makeDirectory()
  let fail = false
  const cache = new RakunRouteCache(directory, async (path) => {
    if (fail) throw new Error('render failed')
    return route(path, 'next')
  })
  await cache.seed(route('/about', 'current'))
  fail = true

  await expect(cache.regenerate('/about')).rejects.toThrow('render failed')
  expect(cache.get('/about')?.html).toBe('current')
})

test('loads only completed route generations', async () => {
  const directory = await makeDirectory()
  const first = new RakunRouteCache(directory, async (path) => route(path, 'one'))
  await first.regenerate('/about')
  const incomplete = resolve(directory, 'L2Fib3V0', '.tmp-incomplete')
  await mkdir(incomplete, { recursive: true })
  await writeFile(resolve(incomplete, 'index.html'), 'broken')

  const second = new RakunRouteCache(directory, async (path) => route(path, 'two'))
  await second.load()
  expect(second.get('/about')?.html).toBe('one')
  expect(await readFile(resolve(incomplete, 'index.html'), 'utf8')).toBe('broken')
})
