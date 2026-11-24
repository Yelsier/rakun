import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, describe, expect, test } from 'bun:test'

import { discoverRakunDocument, discoverRakunModules, hasUseClientDirective } from './modules'

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

  test('promotes modules that import nested or package client components', async () => {
    const directory = await temporaryDirectory()
    const packageDirectory = resolve(directory, 'node_modules', 'client-package')
    await Promise.all([
      mkdir(resolve(directory, 'components'), { recursive: true }),
      mkdir(packageDirectory, { recursive: true }),
    ])
    await Promise.all([
      writeFile(
        resolve(directory, 'Image.tsx'),
        `import Image from './components/Image'\nexport default () => <Image />`
      ),
      writeFile(
        resolve(directory, 'components', 'Image.tsx'),
        `'use client'\nexport default () => null`
      ),
      writeFile(
        resolve(directory, 'PackageImage.tsx'),
        `import Image from 'client-package'\nexport default () => <Image />`
      ),
      writeFile(
        resolve(directory, 'Types.tsx'),
        `import type Image from 'client-package'\nexport default () => null`
      ),
      writeFile(
        resolve(directory, 'RakunImage.tsx'),
        `import { Image } from '@rakun-kit/react'\nexport default () => <Image />`
      ),
      writeFile(
        resolve(directory, 'RakunText.tsx'),
        `import { useT } from '@rakun-kit/react'\nexport default () => useT()`
      ),
      writeFile(
        resolve(packageDirectory, 'package.json'),
        JSON.stringify({ exports: './index.js', name: 'client-package', type: 'module' })
      ),
      writeFile(resolve(packageDirectory, 'index.js'), `export { default } from './Image.js'`),
      writeFile(resolve(packageDirectory, 'Image.js'), `'use client'\nexport default () => null`),
    ])

    const modules = await discoverRakunModules(directory)

    expect(modules.map(({ client, name }) => ({ client, name }))).toEqual([
      { client: true, name: 'Image' },
      { client: true, name: 'PackageImage' },
      { client: true, name: 'RakunImage' },
      { client: false, name: 'RakunText' },
      { client: false, name: 'Types' },
    ])
  })
})

describe('discoverRakunDocument', () => {
  test('accepts a server document and rejects a client document', async () => {
    const root = await temporaryDirectory()
    const documentFile = resolve(root, 'document.tsx')

    expect(await discoverRakunDocument(documentFile)).toBeUndefined()

    await writeFile(documentFile, 'export default function Document() { return null }')
    expect(await discoverRakunDocument(documentFile)).toBe(documentFile)

    await writeFile(
      documentFile,
      `'use client'\nexport default function Document() { return null }`
    )
    expect(discoverRakunDocument(documentFile)).rejects.toThrow(
      'Rakun src/document.tsx must be a server component.'
    )
  })
})
