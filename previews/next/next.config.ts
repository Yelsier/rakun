import { mkdirSync, symlinkSync, lstatSync, readlinkSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(rootDir, '../..')
const managerSrc = path.resolve(repoRoot, 'manager-react/src')

const rakunServerPackages = [
  '@rakun-kit/core',
  '@rakun-kit/express',
  '@rakun-kit/next',
  '@rakun-kit/s3',
  '@rakun-kit/openai',
  '@rakun-kit/resend',
] as const

/** Bun only links workspaces into consuming packages; Turbopack with
 *  `root: repoRoot` resolves from the monorepo root and misses them. */
const ensureRootWorkspaceLinks = () => {
  const scopeDir = path.join(repoRoot, 'node_modules', '@rakun-kit')
  mkdirSync(scopeDir, { recursive: true })

  const packages: Array<[string, string]> = [
    ['core', 'core'],
    ['express', 'adapters/express'],
    ['jsx-email', 'adapters/jsx-email'],
    ['manager-locales', 'manager-locales'],
    ['manager-react', 'manager-react'],
    ['next', 'adapters/next'],
    ['openai', 'adapters/openai'],
    ['plugin-code-editor', 'plugins/code-editor'],
    ['react', 'react'],
    ['resend', 'adapters/resend'],
    ['s3', 'adapters/s3'],
    ['smtp', 'adapters/smtp'],
  ]

  for (const [linkName, packageDir] of packages) {
    const linkPath = path.join(scopeDir, linkName)
    const targetPath = path.resolve(repoRoot, packageDir)
    const relativeTarget = path.relative(scopeDir, targetPath)

    const existing = lstatSync(linkPath, { throwIfNoEntry: false })
    if (existing) {
      if (!existing.isSymbolicLink() || path.resolve(scopeDir, readlinkSync(linkPath)) === targetPath) {
        continue
      }
      unlinkSync(linkPath)
    }

    try {
      if (process.platform === 'win32') {
        symlinkSync(targetPath, linkPath, 'junction')
      } else {
        symlinkSync(relativeTarget, linkPath, 'dir')
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
  }
}

ensureRootWorkspaceLinks()

const isRakunServerPackage = (request: string) =>
  request !== '@rakun-kit/next/manager' &&
  rakunServerPackages.some((pkg) => request === pkg || request.startsWith(`${pkg}/`))

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: repoRoot,
  },
  serverExternalPackages: [...rakunServerPackages, 'yjs'],
  webpack: (config, { isServer, nextRuntime }) => {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@': managerSrc,
    }

    if (isServer && nextRuntime === 'nodejs') {
      const rakunExternals = (
        { request }: { request?: string },
        callback: (error?: Error | null, result?: string) => void
      ) => {
        if (request && isRakunServerPackage(request)) {
          callback(null, `commonjs ${request}`)
          return
        }

        callback()
      }

      if (Array.isArray(config.externals)) {
        config.externals.push(rakunExternals)
      } else if (config.externals) {
        config.externals = [config.externals, rakunExternals]
      } else {
        config.externals = [rakunExternals]
      }
    }

    return config
  },
}

export default nextConfig
