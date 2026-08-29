import { copyFile, cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { basename, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createManagerResolver, writeManagerIconRegistry } from './manager-build'
import { createRakunCssProcessor } from './css'
import { getRakunConfigPath } from './config'
import {
  loadDevelopmentBrowserCache,
  loadDevelopmentServerCache,
  saveDevelopmentBrowserCache,
  saveDevelopmentServerCache,
} from './development-cache'
import { discoverRakunDocument, discoverRakunModules } from './modules'
import type {
  RakunBuildManifest,
  RakunBunBuildResult,
  RakunClientManifest,
  RakunBunDocumentImport,
  RakunModuleDefinition,
  RakunServerModuleRegistry,
  RenderedRoute,
  ResolvedRakunBunConfig,
} from './types'

const toImportSpecifier = (path: string): string => resolve(path).replace(/\\/g, '/')

const getInternalClientPath = (name: 'devtools' | 'index' | 'manager' | 'navigation'): string => {
  const source = import.meta.url.endsWith('.ts')
  return toImportSpecifier(
    resolve(
      import.meta.dir,
      'client',
      `${name}.${source ? (name === 'navigation' ? 'ts' : 'tsx') : 'js'}`
    )
  )
}

const getInternalServerPath = (): string =>
  toImportSpecifier(
    resolve(import.meta.dir, `server.${import.meta.url.endsWith('.ts') ? 'ts' : 'js'}`)
  )

const getInternalLinkPath = (): string =>
  toImportSpecifier(
    resolve(import.meta.dir, `link.${import.meta.url.endsWith('.ts') ? 'tsx' : 'js'}`)
  )

const formatBuildMessage = (message: unknown): string => {
  if (!(message instanceof Error)) return String(message)
  const position = 'position' in message ? message.position : undefined
  if (
    !position ||
    typeof position !== 'object' ||
    !('file' in position) ||
    !('line' in position) ||
    !('column' in position)
  ) {
    return message.message
  }
  return `${message.message}\n    at ${String(position.file)}:${String(position.line)}:${Number(position.column) + 1}`
}

const assertBuild = (result: Bun.BuildOutput, label: string): void => {
  if (result.success) return
  const messages = result.logs.map(formatBuildMessage).join('\n')
  throw new Error(`${label} failed${messages ? `:\n${messages}` : '.'}`)
}

const runBuild = async (options: Bun.BuildConfig, label: string): Promise<Bun.BuildOutput> => {
  let result: Bun.BuildOutput
  try {
    result = await Bun.build(options)
  } catch (error) {
    const failures = error instanceof AggregateError ? error.errors : [error]
    const messages = failures.map(formatBuildMessage).filter(Boolean).join('\n')
    throw new Error(`${label} failed${messages ? `:\n${messages}` : '.'}`, { cause: error })
  }
  assertBuild(result, label)
  return result
}

const createRakunRuntimeResolver = (rootDir: string): Bun.BunPlugin => ({
  name: 'rakun-runtime-resolver',
  setup(builder) {
    builder.onResolve({ filter: /^@rakun-kit\/bun$/ }, () => ({
      path: getInternalLinkPath(),
    }))
    builder.onResolve({ filter: /^@rakun-kit\/core(?:\/.*)?$/ }, ({ path }) => {
      try {
        return { path: Bun.resolveSync(path, rootDir) }
      } catch {
        return undefined
      }
    })
  },
})

const writeServerRegistry = async (
  generatedDir: string,
  modules: RakunModuleDefinition[],
  documentFile?: string
): Promise<string> => {
  const imports = modules.map(
    (module, index) =>
      `import * as module${index} from ${JSON.stringify(toImportSpecifier(module.file))}`
  )
  const entries = modules.map(
    (module, index) =>
      `${JSON.stringify(module.name)}: { ...${JSON.stringify(module)}, module: module${index} }`
  )
  const path = resolve(generatedDir, 'modules.generated.ts')
  const documentImport = documentFile
    ? `import * as document from ${JSON.stringify(toImportSpecifier(documentFile))}`
    : 'const document = undefined'
  await writeFile(
    path,
    `${imports.join('\n')}\n${documentImport}\nexport { document }\nexport const modules = {${entries.join(',\n')}}\n`
  )
  return path
}

const writeClientEntries = async (
  generatedDir: string,
  modules: RakunModuleDefinition[],
  manager: ResolvedRakunBunConfig['manager'],
  development: boolean
): Promise<{
  manager?: string
  modules: Map<string, string>
  navigation: string
}> => {
  const clientModules = new Map<string, string>()
  const navigation = resolve(generatedDir, 'navigation.generated.ts')
  await writeFile(
    navigation,
    [
      ...(development ? [`import ${JSON.stringify(getInternalClientPath('devtools'))}`] : []),
      `import ${JSON.stringify(getInternalClientPath('navigation'))}`,
    ].join('\n')
  )

  let index = 0
  for (const module of modules) {
    if (!module.client) continue
    const id = `module-${String(index).padStart(4, '0')}`
    index += 1
    const entry = resolve(generatedDir, `${id}.generated.ts`)
    await writeFile(
      entry,
      [
        `import * as imported from ${JSON.stringify(toImportSpecifier(module.file))}`,
        `import { hydrateRakunModule } from ${JSON.stringify(getInternalClientPath('index'))}`,
        `const Component = imported.default ?? imported.component`,
        `if (!Component) throw new Error(${JSON.stringify(
          `Rakun web module "${module.name}" must export a component.`
        )})`,
        `export const hydrate = () => hydrateRakunModule(${JSON.stringify(
          module.name
        )}, Component)`,
      ].join('\n')
    )
    clientModules.set(module.name, entry)
  }

  return {
    manager: manager ? getInternalClientPath('manager') : undefined,
    modules: clientModules,
    navigation,
  }
}

const buildBrowserEntries = async ({
  assetsDir,
  config,
  define,
  entrypoints,
  label,
  plugins,
  publicPath = '/assets/',
  splitting = false,
}: {
  assetsDir: string
  config: ResolvedRakunBunConfig
  define?: Record<string, string>
  entrypoints: string[]
  label: string
  plugins?: Bun.BunPlugin[]
  publicPath?: string
  splitting?: boolean
}): Promise<Bun.BuildOutput | undefined> => {
  if (!entrypoints.length) return undefined
  const result = await runBuild(
    {
      define,
      entrypoints,
      format: 'esm',
      jsx: { development: config.server.development },
      metafile: true,
      minify: !config.server.development,
      naming: {
        asset: '[name]-[hash].[ext]',
        chunk: 'chunk-[hash].[ext]',
        entry: '[name]-[hash].[ext]',
      },
      outdir: assetsDir,
      plugins: [
        ...(plugins ?? [createRakunRuntimeResolver(config.rootDir)]),
        ...[createRakunCssProcessor(config)].filter((plugin): plugin is Bun.BunPlugin => !!plugin),
      ],
      publicPath,
      sourcemap: config.server.development ? 'linked' : 'none',
      splitting,
      target: 'browser',
    },
    label
  )
  return result
}

type BuildOutputMetadata = NonNullable<Bun.BuildOutput['metafile']>['outputs'][string]

const escapeRegularExpression = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const optimizeManagerInitialGraph = async ({
  assetsDir,
  config,
  entry,
  generatedDir,
  result,
}: {
  assetsDir: string
  config: ResolvedRakunBunConfig
  entry: string
  generatedDir: string
  result: Bun.BuildOutput
}): Promise<Bun.BuildArtifact> => {
  if (config.server.development || !result.metafile) return getEntryOutput(result, entry)

  const entryArtifact = getEntryOutput(result, entry)
  const artifactsByName = new Map(
    result.outputs
      .filter((output) => output.path.endsWith('.js'))
      .map((output) => [basename(output.path), output])
  )
  const metadataByName = new Map<string, BuildOutputMetadata>(
    Object.entries(result.metafile.outputs)
      .filter(([path]) => path.endsWith('.js'))
      .map(([path, metadata]) => [basename(path), metadata])
  )
  const initialNames = new Set<string>()
  const visitInitial = (name: string): void => {
    if (initialNames.has(name)) return
    initialNames.add(name)
    for (const imported of metadataByName.get(name)?.imports ?? []) {
      if (imported.kind === 'dynamic-import') continue
      const importedName = basename(imported.path)
      if (artifactsByName.has(importedName)) visitInitial(importedName)
    }
  }
  visitInitial(basename(entryArtifact.path))
  if (initialNames.size <= 1) return entryArtifact

  const exportsByName = new Map(
    await Promise.all(
      Array.from(initialNames, async (name) => {
        const source = await artifactsByName.get(name)!.text()
        const exports = new Set(metadataByName.get(name)?.exports ?? [])
        for (const statement of source.matchAll(/export\s*\{([^}]*)\}/g)) {
          for (const binding of statement[1]!.split(',')) {
            const exported = binding
              .trim()
              .split(/\s+as\s+/)
              .at(-1)
            if (exported) exports.add(exported)
          }
        }
        return [name, Array.from(exports)] as const
      })
    )
  )
  const exportAliases = new Map<string, Map<string, string>>()
  const exportStatements: string[] = []
  Array.from(initialNames)
    .sort()
    .forEach((name, fileIndex) => {
      const aliases = new Map<string, string>()
      for (const [exportIndex, exported] of (exportsByName.get(name) ?? []).entries()) {
        const alias = `__rakun_${fileIndex}_${exportIndex}`
        aliases.set(exported, alias)
        exportStatements.push(
          `export { ${exported} as ${alias} } from ${JSON.stringify(
            toImportSpecifier(artifactsByName.get(name)!.path)
          )}`
        )
      }
      exportAliases.set(name, aliases)
    })

  const mergeEntry = resolve(generatedDir, 'manager-initial.generated.ts')
  await writeFile(
    mergeEntry,
    [`import ${JSON.stringify(toImportSpecifier(entryArtifact.path))}`, ...exportStatements].join(
      '\n'
    )
  )
  const mergeResult = await runBuild(
    {
      entrypoints: [mergeEntry],
      format: 'esm',
      jsx: { development: false },
      minify: true,
      naming: { entry: 'manager.generated-[hash].[ext]' },
      outdir: assetsDir,
      plugins: [
        {
          name: 'rakun-manager-initial-graph',
          setup(builder) {
            builder.onResolve({ filter: /^\/assets\/manager\// }, ({ kind, path }) =>
              kind === 'dynamic-import'
                ? { external: true, path }
                : { path: resolve(assetsDir, basename(path)) }
            )
          },
        },
      ],
      publicPath: '/assets/manager/',
      splitting: false,
      target: 'browser',
    },
    'Rakun manager initial graph optimization'
  )
  const mergedArtifact = getEntryOutput(mergeResult, mergeEntry)
  const mergedUrl = `/assets/manager/${basename(mergedArtifact.path)}`

  await Promise.all(
    result.outputs
      .filter((output) => output.path.endsWith('.js') && !initialNames.has(basename(output.path)))
      .map(async (output) => {
        let source = await output.text()
        for (const name of initialNames) {
          const url = `/assets/manager/${name}`
          const escapedUrl = escapeRegularExpression(url)
          const aliases = exportAliases.get(name)!
          source = source.replace(
            new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["']${escapedUrl}["'];?`, 'g'),
            (_statement, rawBindings: string) => {
              const bindings = rawBindings
                .split(',')
                .map((binding) => binding.trim())
                .filter(Boolean)
                .map((binding) => {
                  const [exported, local = exported] = binding.split(/\s+as\s+/)
                  const alias = aliases.get(exported)
                  if (!alias) {
                    throw new Error(
                      `Rakun manager chunk imports unknown export "${exported}" from "${name}" (available: ${Array.from(
                        aliases.keys()
                      ).join(', ')}).`
                    )
                  }
                  return `${alias} as ${local}`
                })
              return `import{${bindings.join(',')}}from${JSON.stringify(mergedUrl)};`
            }
          )
          source = source.replace(
            new RegExp(`import\\s*["']${escapedUrl}["'];?`, 'g'),
            `import${JSON.stringify(mergedUrl)};`
          )
          if (source.includes(url)) {
            throw new Error(`Failed to merge Rakun manager dependency "${url}".`)
          }
        }
        await writeFile(output.path, source)
      })
  )
  await Promise.all(
    Array.from(initialNames, (name) => rm(resolve(assetsDir, name), { force: true }))
  )
  return mergedArtifact
}

const normalizeEntryPoint = (path: string): string =>
  resolve(path).replace(/\\/g, '/').toLowerCase()

const getEntryOutput = (result: Bun.BuildOutput, entry: string): Bun.BuildArtifact => {
  const normalized = normalizeEntryPoint(entry)
  const outputPath = Object.entries(result.metafile?.outputs ?? {}).find(
    ([, output]) => output.entryPoint && normalizeEntryPoint(output.entryPoint) === normalized
  )?.[0]
  const artifact = result.outputs.find(
    (output) =>
      output.kind === 'entry-point' &&
      (!outputPath ||
        normalizeEntryPoint(output.path) === normalizeEntryPoint(outputPath) ||
        basename(output.path) === basename(outputPath))
  )
  if (!artifact) throw new Error(`No Bun build output found for "${entry}".`)
  return artifact
}

const toAssetUrl = (assetsDir: string, artifact: Bun.BuildArtifact): string =>
  `/assets/${relative(assetsDir, artifact.path).replace(/\\/g, '/')}`

const getOutputMetadata = (result: Bun.BuildOutput, artifact: Bun.BuildArtifact) =>
  Object.entries(result.metafile?.outputs ?? {}).find(
    ([path]) =>
      normalizeEntryPoint(path) === normalizeEntryPoint(artifact.path) ||
      basename(path) === basename(artifact.path)
  )?.[1]

export const writeRakunManifests = async (
  outDir: string,
  manifest: RakunBuildManifest,
  staticPaths: string[] = []
): Promise<void> => {
  const manifestsDir = resolve(outDir, 'manifests')
  await mkdir(manifestsDir, { recursive: true })
  await Promise.all([
    writeFile(resolve(manifestsDir, 'modules.json'), JSON.stringify(manifest.modules, null, 2)),
    writeFile(resolve(manifestsDir, 'client.json'), JSON.stringify(manifest.client, null, 2)),
    writeFile(resolve(manifestsDir, 'build.json'), JSON.stringify(manifest, null, 2)),
    writeFile(
      resolve(manifestsDir, 'routes.json'),
      JSON.stringify({ items: staticPaths.map((path) => ({ path })) }, null, 2)
    ),
  ])
}

export const buildRakunCode = async (
  config: ResolvedRakunBunConfig,
  options: {
    clean?: boolean
    client?: boolean | string[]
    previousManifest?: RakunBuildManifest
  } = {}
): Promise<{
  generatedRegistry: string
  document?: RakunBunDocumentImport
  manifest: RakunBuildManifest
  registry: RakunServerModuleRegistry
}> => {
  if (options.clean) {
    await rm(config.outDir, { recursive: true, force: true })
  }
  const generatedDir = resolve(config.rootDir, '.rakun', 'generated')
  const assetsDir = resolve(config.outDir, 'assets')
  const publicDir = resolve(config.rootDir, 'public')
  const outputPublicDir = resolve(config.outDir, 'public')
  if (!config.server.development) {
    await rm(outputPublicDir, { recursive: true, force: true })
    await cp(publicDir, outputPublicDir, { recursive: true, force: true }).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error
      }
    )
  }
  const managerAssetsDir = resolve(assetsDir, 'manager')
  const serverDir = resolve(config.outDir, 'server')
  await Promise.all([
    mkdir(generatedDir, { recursive: true }),
    mkdir(serverDir, { recursive: true }),
  ])

  const [modules, documentFile] = await Promise.all([
    discoverRakunModules(config.modulesDir),
    discoverRakunDocument(config.documentFile),
  ])
  const generatedRegistry = await writeServerRegistry(generatedDir, modules, documentFile)
  const clientEntries = await writeClientEntries(
    generatedDir,
    modules,
    config.manager,
    config.server.development
  )

  const cacheEligible =
    config.server.development &&
    !options.clean &&
    !options.previousManifest &&
    options.client === undefined
  const serverCacheEligible = config.server.development && !options.clean
  const browserCacheContext = {
    config,
    configPath: getRakunConfigPath(config),
    modules,
  }
  const wantsFullBrowserBuild = options.client !== false || !options.previousManifest
  const managerIconRegistry =
    wantsFullBrowserBuild && clientEntries.manager
      ? await writeManagerIconRegistry(generatedDir, config.rootDir)
      : undefined
  const [cachedManifest, cachedServer] = await Promise.all([
    cacheEligible ? loadDevelopmentBrowserCache(browserCacheContext) : undefined,
    serverCacheEligible ? loadDevelopmentServerCache(browserCacheContext) : undefined,
  ])
  if (!options.clean && !options.previousManifest && !cachedManifest) {
    await rm(assetsDir, { recursive: true, force: true })
  }
  await mkdir(assetsDir, { recursive: true })

  const previousManifest = options.previousManifest ?? cachedManifest
  const clientModuleNames = Array.isArray(options.client) ? options.client : undefined
  const partialClientBuild = !!clientModuleNames && !!previousManifest
  const requestedClientModules = partialClientBuild ? new Set(clientModuleNames) : undefined
  const clientEntrypoints = requestedClientModules
    ? Array.from(clientEntries.modules.entries())
        .filter(([name]) => requestedClientModules.has(name))
        .map(([, entry]) => entry)
    : Array.from(clientEntries.modules.values())
  const shouldBuildClient = !cachedManifest && (options.client !== false || !previousManifest)
  const rebuildAllClientAssets = shouldBuildClient && !partialClientBuild
  const manager = config.manager
  const [serverBuild, clientBuild, navigationBuild, managerBuild] = await Promise.all([
    cachedServer
      ? undefined
      : runBuild(
          {
            entrypoints: [generatedRegistry],
            format: 'esm',
            jsx: { development: config.server.development },
            metafile: true,
            naming: 'modules-[hash].[ext]',
            outdir: serverDir,
            packages: 'external',
            plugins: [
              ...[createRakunCssProcessor(config)].filter(
                (plugin): plugin is Bun.BunPlugin => !!plugin
              ),
            ],
            sourcemap: config.server.development ? 'linked' : 'none',
            target: 'bun',
          },
          'Rakun server graph build'
        ),
    shouldBuildClient
      ? buildBrowserEntries({
          assetsDir,
          config,
          entrypoints: clientEntrypoints,
          label: 'Rakun client module build',
        })
      : undefined,
    rebuildAllClientAssets
      ? buildBrowserEntries({
          assetsDir,
          config,
          entrypoints: [clientEntries.navigation],
          label: 'Rakun navigation build',
        })
      : undefined,
    manager && rebuildAllClientAssets && clientEntries.manager
      ? buildBrowserEntries({
          assetsDir: managerAssetsDir,
          config,
          define: {
            __RAKUN_API_BASE_PATH__: JSON.stringify(config.apiBasePath),
            __RAKUN_MANAGER_BASE_PATH__: JSON.stringify(manager.basePath),
            __RAKUN_MANAGER_PREVIEW_ENABLED__: String(manager.preview !== false),
            __RAKUN_MANAGER_PREVIEW_TOKEN_PARAM__: JSON.stringify(
              manager.preview === false ? '' : manager.preview.tokenParam
            ),
            __RAKUN_MANAGER_PREVIEW_WEB_BASE_URL__: JSON.stringify(
              manager.preview === false ? '' : manager.preview.webBaseUrl
            ),
          },
          entrypoints: [clientEntries.manager],
          label: 'Rakun manager build',
          plugins: [createManagerResolver(config.rootDir, managerIconRegistry!)],
          publicPath: '/assets/manager/',
          splitting: true,
        })
      : undefined,
  ])
  const managerEntryArtifact =
    managerBuild && clientEntries.manager
      ? await optimizeManagerInitialGraph({
          assetsDir: managerAssetsDir,
          config,
          entry: clientEntries.manager,
          generatedDir,
          result: managerBuild,
        })
      : undefined

  const serverArtifact = serverBuild?.outputs.find((output) => output.kind === 'entry-point')
  const serverArtifactPath = cachedServer?.artifact ?? serverArtifact?.path
  if (!serverArtifactPath) throw new Error('Rakun server graph has no entry output.')
  const loaded = (await import(`${pathToFileURL(serverArtifactPath).href}?t=${Date.now()}`)) as {
    document?: RakunBunDocumentImport
    modules?: RakunServerModuleRegistry
  }
  if (!loaded.modules) throw new Error('Generated Rakun module registry is invalid.')
  if (loaded.document && !loaded.document.default) {
    throw new Error('Rakun src/document.tsx must export a default component.')
  }

  const client: RakunClientManifest = rebuildAllClientAssets
    ? {}
    : { ...(previousManifest?.client ?? {}) }
  for (const name of Object.keys(client)) {
    if (!clientEntries.modules.has(name)) delete client[name]
  }
  if (clientBuild) {
    for (const [name, entry] of clientEntries.modules) {
      if (partialClientBuild && !requestedClientModules?.has(name)) continue
      const artifact = getEntryOutput(clientBuild, entry)
      const outputMeta = getOutputMetadata(clientBuild, artifact)
      const styles = outputMeta?.cssBundle
        ? [`/assets/${basename(outputMeta.cssBundle)}`]
        : undefined
      client[name] = {
        chunk: toAssetUrl(assetsDir, artifact),
        ...(styles?.length ? { styles } : {}),
      }
    }
  }
  const navigation = navigationBuild
    ? toAssetUrl(assetsDir, getEntryOutput(navigationBuild, clientEntries.navigation))
    : (previousManifest?.navigation ?? '')
  const managerAssets = rebuildAllClientAssets
    ? (() => {
        if (!managerBuild || !clientEntries.manager) return []
        const originalManagerArtifact = getEntryOutput(managerBuild, clientEntries.manager)
        const managerMeta = getOutputMetadata(managerBuild, originalManagerArtifact)
        return [
          toAssetUrl(assetsDir, managerEntryArtifact ?? originalManagerArtifact),
          ...(managerMeta?.cssBundle ? [`/assets/manager/${basename(managerMeta.cssBundle)}`] : []),
        ]
      })()
    : (previousManifest?.managerAssets ?? [])
  const serverCss =
    cachedServer?.css ??
    (serverBuild?.outputs ?? [])
      .filter((output) => output.path.endsWith('.css'))
      .map(({ path }) => path)
  await Promise.all(serverCss.map((path) => copyFile(path, resolve(assetsDir, basename(path)))))
  const clientModuleStyles = new Set(Object.values(client).flatMap((entry) => entry.styles ?? []))
  const managerStyleSet = new Set(managerAssets.filter((asset) => asset.endsWith('.css')))
  const assets = rebuildAllClientAssets
    ? [
        ...serverCss.map((path) => `/assets/${basename(path)}`),
        ...(clientBuild?.outputs ?? [])
          .filter((output) => output.path.endsWith('.css'))
          .map((output) => toAssetUrl(assetsDir, output))
          .filter((asset) => !clientModuleStyles.has(asset) && !managerStyleSet.has(asset)),
      ]
    : Array.from(
        new Set([
          ...(previousManifest?.assets ?? []).filter(
            (asset) => !/^\/assets\/modules-[^/]+\.css$/.test(asset)
          ),
          ...serverCss.map((path) => `/assets/${basename(path)}`),
          ...(clientBuild
            ? clientBuild.outputs
                .filter((output) => output.path.endsWith('.css'))
                .map((output) => toAssetUrl(assetsDir, output))
                .filter((asset) => !clientModuleStyles.has(asset) && !managerStyleSet.has(asset))
            : []),
        ])
      )
  const manifest: RakunBuildManifest = {
    assets,
    client,
    managerAssets,
    modules,
    navigation,
  }
  await writeRakunManifests(config.outDir, manifest)
  const shouldSaveBrowserCache =
    config.server.development &&
    !options.clean &&
    !cachedManifest &&
    (rebuildAllClientAssets || !!clientBuild)
  await Promise.all([
    shouldSaveBrowserCache
      ? saveDevelopmentBrowserCache({
          builds: [clientBuild, navigationBuild, managerBuild],
          context: browserCacheContext,
          extraOutputs: managerEntryArtifact ? [managerEntryArtifact] : [],
          manifest,
          reusePrevious: partialClientBuild,
        }).catch((error) => {
          console.warn('Rakun development browser cache could not be written.', error)
        })
      : undefined,
    serverCacheEligible && !cachedServer && serverBuild && serverArtifact
      ? saveDevelopmentServerCache({
          artifact: serverArtifact,
          build: serverBuild,
          context: browserCacheContext,
        }).catch((error) => {
          console.warn('Rakun development server cache could not be written.', error)
        })
      : undefined,
  ])

  return { document: loaded.document, generatedRegistry, manifest, registry: loaded.modules }
}

export const buildRakunServerBundle = async ({
  config,
  configPath,
  generatedRegistry,
}: {
  config: ResolvedRakunBunConfig
  configPath: string
  generatedRegistry: string
}): Promise<string> => {
  const generatedDir = resolve(config.rootDir, '.rakun', 'generated')
  const entry = resolve(generatedDir, 'server.generated.ts')
  await writeFile(
    entry,
    [
      `import config from ${JSON.stringify(toImportSpecifier(configPath))}`,
      `import { startRakunBun } from ${JSON.stringify(getInternalServerPath())}`,
      `import { document, modules } from ${JSON.stringify(toImportSpecifier(generatedRegistry))}`,
      `const productionConfig = { ...config, server: { ...(config.server ?? {}), development: false } }`,
      `export const app = await startRakunBun(productionConfig, { cwd: ${JSON.stringify(
        config.rootDir
      )}, document, registry: modules })`,
    ].join('\n')
  )
  const result = await runBuild(
    {
      entrypoints: [entry],
      format: 'esm',
      jsx: { development: false },
      naming: 'server.[ext]',
      outdir: config.outDir,
      packages: 'external',
      target: 'bun',
    },
    'Rakun production server build'
  )
  const artifact = result.outputs.find((output) => output.kind === 'entry-point')
  if (!artifact) throw new Error('Rakun production server has no output.')
  return artifact.path
}

export const describeBuild = (
  config: ResolvedRakunBunConfig,
  manifest: RakunBuildManifest,
  routes: RenderedRoute[]
): RakunBunBuildResult => ({
  manifest,
  outDir: config.outDir,
  routes: routes.map((route) => ({
    assets: route.flight.assets,
    flightBytes: Buffer.byteLength(JSON.stringify(route.flight)),
    htmlBytes: Buffer.byteLength(route.html),
    path: route.path,
  })),
  staticPaths: routes.map((route) => route.path),
})
