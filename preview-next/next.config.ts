import { mkdirSync, symlinkSync, existsSync, lstatSync, readlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(rootDir, '..')
const managerSrc = path.resolve(repoRoot, 'manager-react/src')

const rakunServerPackages = [
  '@rakun-kit/core',
  '@rakun-kit/express',
  '@rakun-kit/next',
  '@rakun-kit/s3',
  '@rakun-kit/trpc',
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
    ['express', 'express'],
    ['jsx-email', 'jsx-email'],
    ['manager-locales', 'manager-locales'],
    ['manager-react', 'manager-react'],
    ['next', 'next'],
    ['openai', 'openai'],
    ['plugin-code-editor', 'plugin-code-editor'],
    ['react', 'react'],
    ['resend', 'resend'],
    ['s3', 's3'],
    ['smtp', 'smtp'],
    ['trpc', 'trpc'],
  ]

  for (const [linkName, packageDir] of packages) {
    const linkPath = path.join(scopeDir, linkName)
    const targetPath = path.resolve(repoRoot, packageDir)
    const relativeTarget = path.relative(scopeDir, targetPath)

    if (existsSync(linkPath)) {
      try {
        if (
          lstatSync(linkPath).isSymbolicLink() &&
          path.resolve(scopeDir, readlinkSync(linkPath)) === targetPath
        ) {
          continue
        }
      } catch {
        // recreate below
      }
    }

    try {
      symlinkSync(relativeTarget, linkPath, 'dir')
    } catch {
      // Another process may have created it; ignore races.
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
