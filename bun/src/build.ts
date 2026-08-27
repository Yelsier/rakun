import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { basename, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { discoverRakunDocument, discoverRakunModules } from './modules'
import type {
  RakunBuildManifest,
  RakunBunBuildResult,
  RakunClientManifest,
  RakunBunDocumentImport,
  RakunModuleDefinition,
  RakunServerModuleRegistry,
  ResolvedRakunBunConfig,
} from './types'

const toImportSpecifier = (path: string): string => resolve(path).replace(/\\/g, '/')

const getInternalClientPath = (name: 'index' | 'navigation'): string => {
  const source = import.meta.url.endsWith('.ts')
  return toImportSpecifier(
    resolve(
      import.meta.dir,
      'client',
      `${name}.${source ? (name === 'index' ? 'tsx' : 'ts') : 'js'}`
    )
  )
}

const getInternalServerPath = (): string =>
  toImportSpecifier(
    resolve(import.meta.dir, `server.${import.meta.url.endsWith('.ts') ? 'ts' : 'js'}`)
  )

const assertBuild = (result: Bun.BuildOutput, label: string): void => {
  if (result.success) return
  const messages = result.logs.map((log) => log.message).join('\n')
  throw new Error(`${label} failed${messages ? `:\n${messages}` : '.'}`)
}

const createRakunRuntimeResolver = (rootDir: string): Bun.BunPlugin => ({
  name: 'rakun-runtime-resolver',
  setup(builder) {
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
  apiBasePath: string
): Promise<{
  entries: string[]
  manager?: string
  modules: Map<string, string>
  navigation: string
}> => {
  const entries: string[] = []
  const clientModules = new Map<string, string>()
  const navigation = resolve(generatedDir, 'navigation.generated.ts')
  await writeFile(navigation, `import ${JSON.stringify(getInternalClientPath('navigation'))}\n`)
  entries.push(navigation)

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
    entries.push(entry)
  }

  let managerEntry: string | undefined
  if (manager) {
    managerEntry = resolve(generatedDir, 'manager.generated.tsx')
    await writeFile(
      managerEntry,
      [
        `import { useEffect, useState } from 'react'`,
        `import { createRoot } from 'react-dom/client'`,
        `import { createHttpManagerClient } from '@rakun-kit/manager-react/client/http'`,
        `import { ManagerBrowserApp } from '@rakun-kit/manager-react/app/runtime-app'`,
        `import '@rakun-kit/manager-react/styles.css'`,
        `const apiBasePath = ${JSON.stringify(apiBasePath)}`,
        `const basePath = ${JSON.stringify(manager.basePath)}`,
        `const preview = ${
          manager.preview === false
            ? 'undefined'
            : `{ webBaseUrl: ${JSON.stringify(manager.preview.webBaseUrl)}, tokenParam: ${JSON.stringify(manager.preview.tokenParam)} }`
        }`,
        `const client = createHttpManagerClient({ baseUrl: apiBasePath })`,
        `function App() {`,
        `  const [current, setCurrent] = useState(() => location.pathname + location.search)`,
        `  useEffect(() => {`,
        `    const update = () => setCurrent(location.pathname + location.search)`,
        `    addEventListener('popstate', update)`,
        `    return () => removeEventListener('popstate', update)`,
        `  }, [])`,
        `  const url = new URL(current, location.origin)`,
        `  return <ManagerBrowserApp client={client} realtimeBaseUrl={apiBasePath} preview={preview} basePath={basePath} pathname={url.pathname} searchParams={url.searchParams} />`,
        `}`,
        `const root = document.querySelector('#rakun-manager-root')`,
        `if (root) createRoot(root).render(<App />)`,
      ].join('\n')
    )
    entries.push(managerEntry)
  }

  return {
    entries,
    manager: managerEntry,
    modules: clientModules,
    navigation,
  }
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
  options: { clean?: boolean } = {}
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
  const serverDir = resolve(config.outDir, 'server')
  await Promise.all([
    mkdir(generatedDir, { recursive: true }),
    mkdir(assetsDir, { recursive: true }),
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
    config.apiBasePath
  )

  const [serverBuild, clientBuild] = await Promise.all([
    Bun.build({
      entrypoints: [generatedRegistry],
      format: 'esm',
      naming: 'modules-[hash].[ext]',
      outdir: serverDir,
      packages: 'external',
      sourcemap: config.server.development ? 'linked' : 'none',
      target: 'bun',
    }),
    Bun.build({
      entrypoints: clientEntries.entries,
      format: 'esm',
      metafile: true,
      minify: !config.server.development,
      naming: {
        asset: '[name]-[hash].[ext]',
        chunk: 'chunk-[hash].[ext]',
        entry: '[name]-[hash].[ext]',
      },
      outdir: assetsDir,
      plugins: [createRakunRuntimeResolver(config.rootDir)],
      publicPath: '/assets/',
      sourcemap: config.server.development ? 'linked' : 'none',
      splitting: true,
      target: 'browser',
    }),
  ])
  assertBuild(serverBuild, 'Rakun server graph build')
  assertBuild(clientBuild, 'Rakun client graph build')

  const serverArtifact = serverBuild.outputs.find((output) => output.kind === 'entry-point')
  if (!serverArtifact) throw new Error('Rakun server graph has no entry output.')
  const loaded = (await import(`${pathToFileURL(serverArtifact.path).href}?t=${Date.now()}`)) as {
    document?: RakunBunDocumentImport
    modules?: RakunServerModuleRegistry
  }
  if (!loaded.modules) throw new Error('Generated Rakun module registry is invalid.')
  if (loaded.document && !loaded.document.default) {
    throw new Error('Rakun src/document.tsx must export a default component.')
  }

  const client: RakunClientManifest = {}
  for (const [name, entry] of clientEntries.modules) {
    const artifact = getEntryOutput(clientBuild, entry)
    const outputMeta = getOutputMetadata(clientBuild, artifact)
    const styles = outputMeta?.cssBundle ? [`/assets/${basename(outputMeta.cssBundle)}`] : undefined
    client[name] = {
      chunk: toAssetUrl(assetsDir, artifact),
      ...(styles?.length ? { styles } : {}),
    }
  }
  const navigation = toAssetUrl(assetsDir, getEntryOutput(clientBuild, clientEntries.navigation))
  const managerArtifact = clientEntries.manager
    ? getEntryOutput(clientBuild, clientEntries.manager)
    : undefined
  const managerMeta = managerArtifact ? getOutputMetadata(clientBuild, managerArtifact) : undefined
  const managerAssets = [
    ...(managerArtifact ? [toAssetUrl(assetsDir, managerArtifact)] : []),
    ...(managerMeta?.cssBundle ? [`/assets/${basename(managerMeta.cssBundle)}`] : []),
  ]
  const serverCss = serverBuild.outputs.filter((output) => output.path.endsWith('.css'))
  await Promise.all(
    serverCss.map((output) => copyFile(output.path, resolve(assetsDir, basename(output.path))))
  )
  const clientModuleStyles = new Set(Object.values(client).flatMap((entry) => entry.styles ?? []))
  const managerStyleSet = new Set(managerAssets.filter((asset) => asset.endsWith('.css')))
  const assets = [
    ...serverCss.map((output) => `/assets/${basename(output.path)}`),
    ...clientBuild.outputs
      .filter((output) => output.path.endsWith('.css'))
      .map((output) => toAssetUrl(assetsDir, output))
      .filter((asset) => !clientModuleStyles.has(asset) && !managerStyleSet.has(asset)),
  ]
  const manifest: RakunBuildManifest = {
    assets,
    client,
    managerAssets,
    modules,
    navigation,
  }
  await writeRakunManifests(config.outDir, manifest)

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
      `export const app = await startRakunBun(config, { cwd: ${JSON.stringify(
        config.rootDir
      )}, document, registry: modules })`,
    ].join('\n')
  )
  const result = await Bun.build({
    entrypoints: [entry],
    format: 'esm',
    naming: 'server.[ext]',
    outdir: config.outDir,
    packages: 'external',
    target: 'bun',
  })
  assertBuild(result, 'Rakun production server build')
  const artifact = result.outputs.find((output) => output.kind === 'entry-point')
  if (!artifact) throw new Error('Rakun production server has no output.')
  return artifact.path
}

export const describeBuild = (
  config: ResolvedRakunBunConfig,
  manifest: RakunBuildManifest,
  staticPaths: string[]
): RakunBunBuildResult => ({
  manifest,
  outDir: config.outDir,
  staticPaths,
})
