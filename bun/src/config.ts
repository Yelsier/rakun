import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import type { RakunBunConfig, ResolvedRakunBunConfig } from './types'

const CONFIG_PATH = Symbol('rakun-config-path')

type ConfigWithPath = RakunBunConfig & { [CONFIG_PATH]?: string }

const normalizeBasePath = (value: string, fallback: string): string => {
  const normalized = (value.trim() || fallback).replace(/^\/+|\/+$/g, '')
  return `/${normalized}`
}

export const resolveRakunConfig = (
  config: RakunBunConfig,
  cwd = process.cwd()
): ResolvedRakunBunConfig => {
  const rootDir = resolve(cwd, config.rootDir ?? '.')

  const resolvedConfig: ResolvedRakunBunConfig = {
    ...config,
    apiBasePath: normalizeBasePath(config.apiBasePath ?? '', '/api'),
    documentFile: resolve(rootDir, 'src', 'document.tsx'),
    manager:
      config.manager === false
        ? false
        : {
            basePath: normalizeBasePath(config.manager?.basePath ?? '', '/manager'),
            preview:
              config.manager?.preview === false
                ? false
                : {
                    webBaseUrl: config.manager?.preview?.webBaseUrl?.toString() ?? '',
                    tokenParam: config.manager?.preview?.tokenParam?.trim() || 'rakun_preview',
                  },
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
  const configPath = (config as ConfigWithPath)[CONFIG_PATH]
  if (configPath) {
    Object.defineProperty(resolvedConfig, CONFIG_PATH, { value: configPath })
  }
  return resolvedConfig
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

  const config = resolveRakunConfig(loaded.default, cwd)
  Object.defineProperty(config, CONFIG_PATH, { value: absolutePath })
  return config
}

export const getRakunConfigPath = (config: RakunBunConfig): string | undefined =>
  (config as ConfigWithPath)[CONFIG_PATH]

export const normalizeRakunPath = (value: string): string => {
  const [pathname = '/'] = value.trim().split(/[?#]/, 1)
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  const normalized = withLeadingSlash.replace(/\/{2,}/g, '/').replace(/\/$/, '')
  return normalized || '/'
}
