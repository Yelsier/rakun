import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'

import type { RakunBuildManifest, RakunModuleDefinition, ResolvedRakunBunConfig } from './types'

const CACHE_VERSION = 2
const CACHE_FILE = 'browser-build.json'

type CachedInput = {
  hash: string
  mtimeMs: number
  size: number
}

type CachedOutput = {
  path: string
  size: number
}

type DevelopmentBrowserCache = {
  bunVersion: string
  inputs: Record<string, CachedInput>
  manifest: RakunBuildManifest
  outputs: CachedOutput[]
  signature: string
  version: number
}

type BrowserCacheContext = {
  config: ResolvedRakunBunConfig
  configPath?: string
  modules: RakunModuleDefinition[]
}

type DevelopmentServerCache = {
  artifact: string
  bunVersion: string
  css: string[]
  inputs: Record<string, CachedInput>
  outputs: CachedOutput[]
  signature: string
  version: number
}

type DevelopmentServerCacheHit = {
  artifact: string
  css: string[]
}

const getCachePath = (rootDir: string): string => resolve(rootDir, '.rakun', 'cache', CACHE_FILE)

const getCacheAssetsDir = (rootDir: string): string =>
  resolve(rootDir, '.rakun', 'cache', 'browser-assets')

const getServerCachePath = (rootDir: string): string =>
  resolve(rootDir, '.rakun', 'cache', 'server-build.json')

const getServerCacheAssetsDir = (rootDir: string): string =>
  resolve(rootDir, '.rakun', 'cache', 'server-assets')

const hash = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex')

const fingerprintFile = async (
  path: string,
  cached?: CachedInput
): Promise<CachedInput | undefined> => {
  try {
    const metadata = await stat(path)
    if (!metadata.isFile()) return undefined
    if (cached && cached.mtimeMs === metadata.mtimeMs && cached.size === metadata.size) {
      return cached
    }
    return {
      hash: hash(await readFile(path)),
      mtimeMs: metadata.mtimeMs,
      size: metadata.size,
    }
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }
    throw error
  }
}

const stableValue = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (typeof value === 'function') return value.toString()
  if (typeof value === 'bigint') return value.toString()
  if (typeof value !== 'object' || value === null) return value
  if (seen.has(value)) return '[Circular]'
  seen.add(value)

  if (Array.isArray(value)) return value.map((entry) => stableValue(entry, seen))
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(Reflect.get(value, key), seen)])
  )
}

const getSignature = ({ config, configPath, modules }: BrowserCacheContext): string =>
  hash(
    JSON.stringify({
      apiBasePath: config.apiBasePath,
      configPath,
      css: stableValue(config.css),
      manager: config.manager,
      modules: modules
        .filter((module) => module.client)
        .map(({ file, name }) => ({ file: resolve(file), name })),
      rootDir: config.rootDir,
    })
  )

const getServerSignature = ({ config, configPath }: BrowserCacheContext): string =>
  hash(
    JSON.stringify({
      configPath,
      css: stableValue(config.css),
      rootDir: config.rootDir,
    })
  )

const isManifest = (value: unknown): value is RakunBuildManifest => {
  if (!value || typeof value !== 'object') return false
  const manifest = value as Partial<RakunBuildManifest>
  return (
    Array.isArray(manifest.assets) &&
    !!manifest.client &&
    typeof manifest.client === 'object' &&
    Array.isArray(manifest.managerAssets) &&
    Array.isArray(manifest.modules) &&
    typeof manifest.navigation === 'string'
  )
}

const isCachedInput = (value: unknown): value is CachedInput => {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<CachedInput>
  return (
    typeof input.hash === 'string' &&
    typeof input.mtimeMs === 'number' &&
    typeof input.size === 'number'
  )
}

const isCachedOutput = (value: unknown): value is CachedOutput => {
  if (!value || typeof value !== 'object') return false
  const output = value as Partial<CachedOutput>
  return typeof output.path === 'string' && typeof output.size === 'number'
}

const isCache = (value: unknown): value is DevelopmentBrowserCache => {
  if (!value || typeof value !== 'object') return false
  const cache = value as Partial<DevelopmentBrowserCache>
  return (
    cache.version === CACHE_VERSION &&
    cache.bunVersion === Bun.version &&
    typeof cache.signature === 'string' &&
    !!cache.inputs &&
    typeof cache.inputs === 'object' &&
    Object.keys(cache.inputs).length > 0 &&
    Object.values(cache.inputs).every(isCachedInput) &&
    Array.isArray(cache.outputs) &&
    cache.outputs.length > 0 &&
    cache.outputs.every(isCachedOutput) &&
    isManifest(cache.manifest)
  )
}

const isServerCache = (value: unknown): value is DevelopmentServerCache => {
  if (!value || typeof value !== 'object') return false
  const cache = value as Partial<DevelopmentServerCache>
  return (
    cache.version === CACHE_VERSION &&
    cache.bunVersion === Bun.version &&
    typeof cache.artifact === 'string' &&
    Array.isArray(cache.css) &&
    cache.css.every((path) => typeof path === 'string') &&
    typeof cache.signature === 'string' &&
    !!cache.inputs &&
    typeof cache.inputs === 'object' &&
    Object.keys(cache.inputs).length > 0 &&
    Object.values(cache.inputs).every(isCachedInput) &&
    Array.isArray(cache.outputs) &&
    cache.outputs.length > 0 &&
    cache.outputs.every(isCachedOutput)
  )
}

const resolveInputPath = (path: string): string =>
  resolve(isAbsolute(path) ? path : resolve(process.cwd(), path))

const getAdditionalInputs = ({ config, configPath }: BrowserCacheContext): string[] => [
  resolve(import.meta.dir, `build.${import.meta.url.endsWith('.ts') ? 'ts' : 'js'}`),
  ...(configPath ? [resolve(configPath)] : []),
  resolve(config.rootDir, 'package.json'),
  resolve(config.rootDir, 'bun.lock'),
  resolve(config.rootDir, 'bun.lockb'),
]

const fingerprintInputs = async (
  paths: Iterable<string>,
  cached: Record<string, CachedInput> = {}
): Promise<Record<string, CachedInput>> => {
  const uniquePaths = Array.from(new Set(Array.from(paths, resolveInputPath))).sort()
  const entries: Array<[string, CachedInput]> = []

  for (let index = 0; index < uniquePaths.length; index += 32) {
    const batch = uniquePaths.slice(index, index + 32)
    const fingerprints = await Promise.all(
      batch.map(async (path) => [path, await fingerprintFile(path, cached[path])] as const)
    )
    for (const [path, fingerprint] of fingerprints) {
      if (fingerprint) entries.push([path, fingerprint])
    }
  }

  return Object.fromEntries(entries)
}

const isInside = (parent: string, child: string): boolean => {
  const childRelative = relative(parent, child)
  return childRelative !== '' && childRelative !== '..' && !childRelative.startsWith(`..${sep}`)
}

const inputsMatch = async (inputs: Record<string, CachedInput>): Promise<boolean> => {
  const current = await fingerprintInputs(Object.keys(inputs), inputs)
  return (
    Object.keys(current).length === Object.keys(inputs).length &&
    Object.entries(inputs).every(([path, fingerprint]) => current[path]?.hash === fingerprint.hash)
  )
}

const restoreCachedOutputs = async (
  outputs: CachedOutput[],
  cacheDir: string,
  outputDir: string
): Promise<boolean> => {
  for (let index = 0; index < outputs.length; index += 32) {
    const restored = await Promise.all(
      outputs.slice(index, index + 32).map(async (output) => {
        const cachedPath = resolve(cacheDir, output.path)
        const outputPath = resolve(outputDir, output.path)
        if (!isInside(cacheDir, cachedPath) || !isInside(outputDir, outputPath)) return false
        const cachedMetadata = await stat(cachedPath).catch(() => undefined)
        if (!cachedMetadata?.isFile() || cachedMetadata.size !== output.size) return false
        const outputMetadata = await stat(outputPath).catch(() => undefined)
        if (!outputMetadata?.isFile() || outputMetadata.size !== output.size) {
          await mkdir(dirname(outputPath), { recursive: true })
          await copyFile(cachedPath, outputPath)
        }
        return true
      })
    )
    if (restored.includes(false)) return false
  }
  return true
}

const cacheOutputs = async (
  paths: string[],
  outputDir: string,
  cacheDir: string
): Promise<CachedOutput[]> => {
  await rm(cacheDir, { recursive: true, force: true })
  return (
    await Promise.all(
      paths.map(async (path): Promise<CachedOutput | undefined> => {
        if (!isInside(outputDir, path)) return undefined
        const metadata = await stat(path).catch(() => undefined)
        if (!metadata?.isFile()) return undefined
        const outputPath = relative(outputDir, path)
        const cachedPath = resolve(cacheDir, outputPath)
        await mkdir(dirname(cachedPath), { recursive: true })
        await copyFile(path, cachedPath)
        return { path: outputPath, size: metadata.size }
      })
    )
  ).filter((output): output is CachedOutput => !!output)
}

export const loadDevelopmentBrowserCache = async (
  context: BrowserCacheContext
): Promise<RakunBuildManifest | undefined> => {
  try {
    const cache: unknown = JSON.parse(await readFile(getCachePath(context.config.rootDir), 'utf8'))
    if (!isCache(cache) || cache.signature !== getSignature(context)) return undefined

    if (!(await inputsMatch(cache.inputs))) return undefined

    const cacheAssetsDir = getCacheAssetsDir(context.config.rootDir)
    const assetsDir = resolve(context.config.outDir, 'assets')
    if (!(await restoreCachedOutputs(cache.outputs, cacheAssetsDir, assetsDir))) return undefined

    return cache.manifest
  } catch {
    return undefined
  }
}

export const saveDevelopmentBrowserCache = async ({
  builds,
  context,
  extraOutputs = [],
  manifest,
  reusePrevious = false,
}: {
  builds: Array<Bun.BuildOutput | undefined>
  context: BrowserCacheContext
  extraOutputs?: Bun.BuildArtifact[]
  manifest: RakunBuildManifest
  reusePrevious?: boolean
}): Promise<void> => {
  const previous = reusePrevious
    ? await readFile(getCachePath(context.config.rootDir), 'utf8')
        .then((source): unknown => JSON.parse(source))
        .then((value) =>
          isCache(value) && value.signature === getSignature(context) ? value : undefined
        )
        .catch(() => undefined)
    : undefined
  const inputPaths = builds.flatMap((build) => Object.keys(build?.metafile?.inputs ?? {}))
  inputPaths.push(...Object.keys(previous?.inputs ?? {}))
  inputPaths.push(...getAdditionalInputs(context))
  const inputs = await fingerprintInputs(inputPaths, previous?.inputs)
  const outputPaths = Array.from(
    new Set(
      [...builds.flatMap((build) => build?.outputs ?? []), ...extraOutputs]
        .map((output) => resolve(output.path))
        .concat(
          (previous?.outputs ?? []).map((output) =>
            resolve(context.config.outDir, 'assets', output.path)
          )
        )
    )
  )
  const assetsDir = resolve(context.config.outDir, 'assets')
  const cacheAssetsDir = getCacheAssetsDir(context.config.rootDir)
  const outputs = await cacheOutputs(outputPaths, assetsDir, cacheAssetsDir)
  if (!Object.keys(inputs).length || !outputs.length) return
  const cache: DevelopmentBrowserCache = {
    bunVersion: Bun.version,
    inputs,
    manifest,
    outputs,
    signature: getSignature(context),
    version: CACHE_VERSION,
  }
  const cachePath = getCachePath(context.config.rootDir)
  const temporaryPath = `${cachePath}.${process.pid}.tmp`
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(temporaryPath, JSON.stringify(cache))
  await rename(temporaryPath, cachePath)
}

export const loadDevelopmentServerCache = async (
  context: BrowserCacheContext
): Promise<DevelopmentServerCacheHit | undefined> => {
  try {
    const cache: unknown = JSON.parse(
      await readFile(getServerCachePath(context.config.rootDir), 'utf8')
    )
    if (!isServerCache(cache) || cache.signature !== getServerSignature(context)) return undefined
    if (!(await inputsMatch(cache.inputs))) return undefined

    const cacheDir = getServerCacheAssetsDir(context.config.rootDir)
    const serverDir = resolve(context.config.outDir, 'server')
    if (!(await restoreCachedOutputs(cache.outputs, cacheDir, serverDir))) return undefined
    const outputPaths = new Set(cache.outputs.map((output) => output.path))
    if (!outputPaths.has(cache.artifact) || cache.css.some((path) => !outputPaths.has(path))) {
      return undefined
    }
    const artifact = resolve(serverDir, cache.artifact)
    const css = cache.css.map((path) => resolve(serverDir, path))
    if (!isInside(serverDir, artifact) || css.some((path) => !isInside(serverDir, path))) {
      return undefined
    }
    return { artifact, css }
  } catch {
    return undefined
  }
}

export const saveDevelopmentServerCache = async ({
  artifact,
  build,
  context,
}: {
  artifact: Bun.BuildArtifact
  build: Bun.BuildOutput
  context: BrowserCacheContext
}): Promise<void> => {
  const inputPaths = Object.keys(build.metafile?.inputs ?? {})
  inputPaths.push(...getAdditionalInputs(context))
  const inputs = await fingerprintInputs(inputPaths)
  const serverDir = resolve(context.config.outDir, 'server')
  const cacheDir = getServerCacheAssetsDir(context.config.rootDir)
  const outputPaths = build.outputs.map((output) => resolve(output.path))
  const outputs = await cacheOutputs(outputPaths, serverDir, cacheDir)
  const artifactPath = relative(serverDir, artifact.path)
  const css = build.outputs
    .filter((output) => output.path.endsWith('.css'))
    .map((output) => relative(serverDir, output.path))
  if (
    !Object.keys(inputs).length ||
    !outputs.length ||
    !isInside(serverDir, resolve(artifact.path))
  ) {
    return
  }
  const cache: DevelopmentServerCache = {
    artifact: artifactPath,
    bunVersion: Bun.version,
    css,
    inputs,
    outputs,
    signature: getServerSignature(context),
    version: CACHE_VERSION,
  }
  const cachePath = getServerCachePath(context.config.rootDir)
  const temporaryPath = `${cachePath}.${process.pid}.tmp`
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(temporaryPath, JSON.stringify(cache))
  await rename(temporaryPath, cachePath)
}
