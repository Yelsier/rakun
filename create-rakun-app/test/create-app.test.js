import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  CreateRakunAppError,
  PACKAGE_VERSION_POLICIES,
  createApp,
  parseArguments,
  resolvePackageVersions,
} from '../src/index.js'

const temporaryDirectories = []
const resolvedVersions = Object.fromEntries(
  PACKAGE_VERSION_POLICIES.map((policy, index) => [policy.name, `1.2.${index + 1}`])
)
const resolveVersions = async () => resolvedVersions

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

describe('create-rakun-app', () => {
  test('parses the Next.js template and no-install option', () => {
    expect(parseArguments(['my-site', '--template', 'nextjs', '--no-install'])).toMatchObject({
      install: false,
      projectDirectory: 'my-site',
      template: 'nextjs',
    })
  })

  test('pins resolved numeric versions in the Next.js starter', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'create-rakun-app-'))
    temporaryDirectories.push(cwd)

    const result = await createApp({
      cwd,
      install: false,
      projectDirectory: 'My Rakun Site',
      resolveVersions,
      template: 'nextjs',
    })
    const packageJson = JSON.parse(
      await readFile(path.join(result.targetDirectory, 'package.json'), 'utf8')
    )

    expect(packageJson.name).toBe('my-rakun-site')
    expect(packageJson.type).toBe('module')
    expect(packageJson.dependencies.next).toBe(resolvedVersions.next)
    expect(packageJson.dependencies['@rakun-kit/core']).toBe(resolvedVersions['@rakun-kit/core'])
    expect(packageJson.dependencies['@rakun-kit/next']).toBe(resolvedVersions['@rakun-kit/next'])
    expect(JSON.stringify(packageJson)).not.toContain('latest')
    expect(JSON.stringify(packageJson)).not.toContain('__VERSION_')
    expect(
      await stat(path.join(result.targetDirectory, 'app/api/rakun/[[...rakun]]/route.ts'))
    ).toBeTruthy()
    expect(await stat(path.join(result.targetDirectory, '.env.local'))).toBeTruthy()
  })

  test('accepts next as an alias and refuses non-empty targets', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'create-rakun-app-'))
    temporaryDirectories.push(cwd)
    await createApp({
      cwd,
      install: false,
      projectDirectory: 'existing',
      resolveVersions,
      template: 'next',
    })

    await expect(
      createApp({
        cwd,
        install: false,
        projectDirectory: 'existing',
        resolveVersions,
        template: 'nextjs',
      })
    ).rejects.toBeInstanceOf(CreateRakunAppError)
  })

  test('resolves latest tags and compatible package lines from npm metadata', async () => {
    const fetchImpl = async (url) => {
      const decodedUrl = decodeURIComponent(String(url))
      const policy = PACKAGE_VERSION_POLICIES.find((item) => decodedUrl.includes(`/${item.name}`))
      if (!policy) return new Response(null, { status: 404 })

      if (!policy.line) {
        return Response.json({ version: '9.8.7' })
      }

      const lineParts = policy.line.split('.')
      const compatibleVersion = lineParts.length === 1 ? `${policy.line}.4.2` : `${policy.line}.2`
      return Response.json({
        versions: {
          '1.0.0': {},
          [`${compatibleVersion}-beta.1`]: {},
          [compatibleVersion]: {},
        },
      })
    }

    const versions = await resolvePackageVersions({
      fetchImpl,
      registryUrl: 'https://registry.test',
    })

    expect(versions.next).toBe('9.8.7')
    expect(versions.typescript).toBe('6.4.2')
    expect(versions.sharp).toBe('0.34.2')
  })
})
