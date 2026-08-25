import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, describe, expect, test } from 'bun:test'

import { discoverRakunModules, hasUseClientDirective } from './modules'

const temporaryDirectories: string[] = []

const temporaryDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'rakun-bun-modules-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

describe('hasUseClientDirective', () => {
  test('finds a directive after comments', () => {
    expect(hasUseClientDirective(`/* module */\n// boundary\n'use client'\nexport default 1`)).toBe(
      true
    )
  })

  test('does not treat a later string as a directive', () => {
    expect(hasUseClientDirective(`const value = 'use client'\nexport default value`)).toBe(false)
  })

  test('finds use client within a directive prologue', () => {
    expect(
      hasUseClientDirective(`'use strict'\n/* boundary */\n'use client'\nexport default 1`)
    ).toBe(true)
  })
})

describe('discoverRakunModules', () => {
  test('supports flat files and directory indexes', async () => {
    const directory = await temporaryDirectory()
    await mkdir(resolve(directory, 'Gallery'), { recursive: true })
    await Promise.all([
      writeFile(resolve(directory, 'Hero.tsx'), 'export default () => null'),
      writeFile(
        resolve(directory, 'Gallery', 'index.tsx'),
        `'use client'\nexport default () => null`
      ),
      writeFile(resolve(directory, 'Gallery', 'helpers.ts'), `export const helper = true`),
    ])

    const modules = await discoverRakunModules(directory)
    expect(modules.map(({ client, name }) => ({ client, name }))).toEqual([
      { client: true, name: 'Gallery' },
      { client: false, name: 'Hero' },
    ])
  })

  test('rejects duplicate discovered names', async () => {
    const directory = await temporaryDirectory()
    await mkdir(resolve(directory, 'Hero'), { recursive: true })
    await Promise.all([
      writeFile(resolve(directory, 'Hero.tsx'), 'export default () => null'),
      writeFile(resolve(directory, 'Hero', 'index.tsx'), 'export default () => null'),
    ])

    await expect(discoverRakunModules(directory)).rejects.toThrow('Duplicate Rakun module "Hero"')
  })
})
