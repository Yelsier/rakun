import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import type { RakunBunConfig, ResolvedRakunBunConfig } from './types'

const normalizeBasePath = (value: string, fallback: string): string => {
  const normalized = (value.trim() || fallback).replace(/^\/+|\/+$/g, '')
  return `/${normalized}`
}

export const defineRakunConfig = <TConfig extends RakunBunConfig>(config: TConfig): TConfig =>
  config

export const resolveRakunConfig = (
  config: RakunBunConfig,
  cwd = process.cwd()
): ResolvedRakunBunConfig => {
  const rootDir = resolve(cwd, config.rootDir ?? '.')

  return {
    ...config,
    apiBasePath: normalizeBasePath(config.apiBasePath ?? '', '/api'),
    manager:
      config.manager === false
        ? false
        : {
            basePath: normalizeBasePath(config.manager?.basePath ?? '', '/manager'),
          },
    modulesDir: resolve(rootDir, config.modulesDir ?? 'src/modules'),
    outDir: resolve(rootDir, config.outDir ?? 'dist'),
    rootDir,
    server: {
      hostname: config.server?.hostname ?? '0.0.0.0',
      port: config.server?.port ?? 3000,
      development: config.server?.development ?? process.env.NODE_ENV !== 'production',
    },
  }
}

export const loadRakunConfig = async (
  configPath = 'rakun.config.ts',
  cwd = process.cwd()
): Promise<ResolvedRakunBunConfig> => {
  const absolutePath = resolve(cwd, configPath)
  const loaded = (await import(`${pathToFileURL(absolutePath).href}?t=${Date.now()}`)) as {
    default?: RakunBunConfig
  }

  if (!loaded.default) {
    throw new Error(`Rakun config "${absolutePath}" must have a default export.`)
  }

  return resolveRakunConfig(loaded.default, cwd)
}

export const normalizeRakunPath = (value: string): string => {
  const [pathname = '/'] = value.trim().split(/[?#]/, 1)
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  const normalized = withLeadingSlash.replace(/\/{2,}/g, '/').replace(/\/$/, '')
  return normalized || '/'
}
