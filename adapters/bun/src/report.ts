import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, relative, resolve } from 'node:path'

import type { RakunBunBuildResult, ResolvedRakunBunConfig } from './types'

type BuildFile = {
  bytes: number
  path: string
  url: string
}

type CollapsedItem<T> = { kind: 'item'; value: T } | { count: number; kind: 'omitted' }

const MAX_ROUTE_ROWS = 20
const MAX_BUNDLE_ROWS = 16

const formatBytes = (bytes: number): string => {
  if (bytes < 1_000) return `${bytes} B`
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(bytes < 10_000 ? 1 : 0)} kB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

const formatDuration = (milliseconds: number): string =>
  milliseconds < 1_000 ? `${Math.round(milliseconds)}ms` : `${(milliseconds / 1_000).toFixed(1)}s`

const collapseItems = <T>(items: T[], limit: number): CollapsedItem<T>[] => {
  if (items.length <= limit) return items.map((value) => ({ kind: 'item', value }))
  const head = Math.ceil(limit / 2)
  const tail = Math.floor(limit / 2)
  return [
    ...items.slice(0, head).map((value) => ({ kind: 'item' as const, value })),
    { count: items.length - head - tail, kind: 'omitted' as const },
    ...items.slice(-tail).map((value) => ({ kind: 'item' as const, value })),
  ]
}

const truncate = (value: string, width: number): string =>
  value.length <= width ? value : `${value.slice(0, Math.max(1, width - 1))}…`

const collectFiles = async (rootDir: string, directory = rootDir): Promise<BuildFile[]> => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw error
    }
  )
  const nested = await Promise.all(
    entries.map(async (entry): Promise<BuildFile[]> => {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) return await collectFiles(rootDir, path)
      if (!entry.isFile()) return []
      return [
        {
          bytes: (await stat(path)).size,
          path,
          url: `/${relative(rootDir, path).replace(/\\/g, '/')}`,
        },
      ]
    })
  )
  return nested.flat()
}

const sumUrls = (urls: string[], sizes: Map<string, number>): number =>
  Array.from(new Set(urls)).reduce((total, url) => total + (sizes.get(url) ?? 0), 0)

const collectGzipSizes = async (
  urls: string[],
  files: Map<string, BuildFile>
): Promise<Map<string, number>> =>
  new Map(
    await Promise.all(
      Array.from(new Set(urls)).map(async (url) => {
        const file = files.get(url)
        if (!file || file.bytes < 1_024) return [url, file?.bytes ?? 0] as const
        return [url, Bun.gzipSync(await readFile(file.path)).byteLength] as const
      })
    )
  )

const treePrefix = (index: number, length: number): string =>
  index === 0 ? '┌' : index === length - 1 ? '└' : '├'

export const formatRakunBuildReport = async ({
  config,
  durationMs,
  result,
  serverPath,
}: {
  config: Pick<ResolvedRakunBunConfig, 'apiBasePath' | 'manager' | 'outDir'>
  durationMs?: number
  result: RakunBunBuildResult
  serverPath: string
}): Promise<string> => {
  const files = await collectFiles(config.outDir)
  const filesByUrl = new Map(files.map((file) => [file.url, file]))
  const sizes = new Map(files.map((file) => [file.url, file.bytes]))
  const clientAssetUrls = [
    result.manifest.navigation,
    ...result.manifest.managerAssets,
    ...Object.values(result.manifest.client).flatMap((entry) => [
      entry.chunk,
      ...(entry.styles ?? []),
    ]),
    ...result.routes.flatMap((route) => [...route.assets.scripts, ...route.assets.styles]),
  ].filter(Boolean)
  const gzipSizes = await collectGzipSizes(clientAssetUrls, filesByUrl)
  const routeItems = collapseItems(result.routes, MAX_ROUTE_ROWS)
  const routePathWidth = Math.min(
    48,
    Math.max(
      18,
      ...routeItems.map((item) =>
        item.kind === 'item' ? item.value.path.length : `${item.count} routes omitted`.length
      )
    )
  )
  const lines = [
    durationMs === undefined
      ? 'Rakun build'
      : `Rakun build completed in ${formatDuration(durationMs)}`,
    '',
    `Routes (${result.routes.length} static)`,
    `  ${'Route'.padEnd(routePathWidth + 4)} ${'HTML'.padStart(9)} ${'Flight'.padStart(
      9
    )} ${'Assets'.padStart(9)} ${'Gzip'.padStart(9)}  Bundles`,
  ]

  if (!routeItems.length) {
    lines.push('  ─ No static routes generated')
  } else {
    routeItems.forEach((item, index) => {
      const prefix = treePrefix(index, routeItems.length)
      if (item.kind === 'omitted') {
        lines.push(`  ${prefix} … ${item.count} routes omitted`)
        return
      }
      const route = item.value
      const routeAssets = [
        result.manifest.navigation,
        ...route.assets.scripts,
        ...route.assets.styles,
      ].filter(Boolean)
      const firstLoad = sumUrls(routeAssets, sizes)
      const firstLoadGzip = sumUrls(routeAssets, gzipSizes)
      const bundles = [
        ...(result.manifest.navigation ? ['navigation'] : []),
        ...route.assets.clientModules,
      ].join(', ')
      lines.push(
        `  ${prefix} ○ ${truncate(route.path, routePathWidth).padEnd(
          routePathWidth
        )} ${formatBytes(route.htmlBytes).padStart(9)} ${formatBytes(route.flightBytes).padStart(
          9
        )} ${formatBytes(firstLoad).padStart(9)} ${formatBytes(firstLoadGzip).padStart(
          9
        )}  ${bundles || 'server only'}`
      )
    })
  }

  const clientUsage = new Map<string, number>()
  for (const route of result.routes) {
    for (const name of route.assets.clientModules) {
      clientUsage.set(name, (clientUsage.get(name) ?? 0) + 1)
    }
  }
  const bundles = [
    ...(result.manifest.navigation
      ? [
          {
            bytes: sizes.get(result.manifest.navigation) ?? 0,
            file: basename(result.manifest.navigation),
            gzipBytes: gzipSizes.get(result.manifest.navigation) ?? 0,
            name: 'navigation',
            usage: result.routes.length,
          },
        ]
      : []),
    ...Object.entries(result.manifest.client)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, entry]) => ({
        bytes: sumUrls([entry.chunk, ...(entry.styles ?? [])], sizes),
        file: basename(entry.chunk),
        gzipBytes: sumUrls([entry.chunk, ...(entry.styles ?? [])], gzipSizes),
        name,
        usage: clientUsage.get(name) ?? 0,
      })),
  ]
  const bundleItems = collapseItems(bundles, MAX_BUNDLE_ROWS)
  const bundleNameWidth = Math.min(
    28,
    Math.max(
      12,
      ...bundleItems.map((item) =>
        item.kind === 'item' ? item.value.name.length : `${item.count} bundles omitted`.length
      )
    )
  )
  lines.push(
    '',
    `Client bundles (${bundles.length})`,
    `  ${'Bundle'.padEnd(bundleNameWidth + 2)} ${'Size'.padStart(9)} ${'Gzip'.padStart(
      9
    )} ${'Routes'.padStart(8)}  File`
  )
  if (!bundleItems.length) {
    lines.push('  ─ No client bundles')
  } else {
    bundleItems.forEach((item, index) => {
      const prefix = treePrefix(index, bundleItems.length)
      if (item.kind === 'omitted') {
        lines.push(`  ${prefix} … ${item.count} bundles omitted`)
        return
      }
      const bundle = item.value
      lines.push(
        `  ${prefix} ${truncate(bundle.name, bundleNameWidth).padEnd(
          bundleNameWidth
        )} ${formatBytes(bundle.bytes).padStart(9)} ${formatBytes(bundle.gzipBytes).padStart(
          9
        )} ${String(bundle.usage).padStart(8)}  ${bundle.file}`
      )
    })
  }

  const managerFiles = config.manager
    ? files.filter((file) => file.url.startsWith('/assets/manager/'))
    : []
  const managerInitialBytes = sumUrls(result.manifest.managerAssets, sizes)
  const managerInitialGzipBytes = sumUrls(result.manifest.managerAssets, gzipSizes)
  const managerBytes = managerFiles.reduce((total, file) => total + file.bytes, 0)
  const managerJavascriptFiles = managerFiles.filter((file) => file.url.endsWith('.js'))
  const managerInitialScripts = result.manifest.managerAssets.filter((url) => url.endsWith('.js'))
  const managerPageBundles = new Set<string>()
  for (const url of managerInitialScripts) {
    const file = filesByUrl.get(url)
    if (!file) continue
    const source = await readFile(file.path, 'utf8')
    for (const match of source.matchAll(
      /import\(\s*["'](\/assets\/manager\/[^"']+\.js)["']\s*\)/g
    )) {
      managerPageBundles.add(match[1]!)
    }
  }
  const managerSupportingChunks = Math.max(
    0,
    managerJavascriptFiles.length - managerInitialScripts.length - managerPageBundles.size
  )
  const outputBytes = files.reduce((total, file) => total + file.bytes, 0)
  const serverBytes = files.find((file) => file.path === resolve(serverPath))?.bytes ?? 0
  const runtimeRoutes = [
    '/* (dynamic web fallback)',
    `${config.apiBasePath}/*`,
    ...(config.manager ? [`${config.manager.basePath}/*`] : []),
    '/_rakun/*',
  ]
  lines.push('', 'Runtime routes')
  runtimeRoutes.forEach((route, index) => {
    lines.push(`  ${treePrefix(index, runtimeRoutes.length)} ƒ ${route}`)
  })
  if (config.manager) {
    lines.push(
      '',
      `Manager initial ${formatBytes(managerInitialBytes)} (${formatBytes(managerInitialGzipBytes)} gzip) across ${result.manifest.managerAssets.length} file(s)`,
      `Manager routes  ${managerPageBundles.size} lazy page bundle(s) + ${managerSupportingChunks} supporting chunk(s)`,
      `Manager output  ${formatBytes(managerBytes)} across ${managerFiles.length} file(s) (lazy chunks under /assets/manager)`
    )
  }
  lines.push(
    '',
    `Server bundle   ${formatBytes(serverBytes)}  ${basename(serverPath)}`,
    `Total output    ${formatBytes(outputBytes)}  ${config.outDir}`,
    '',
    '○ prerendered static route   ƒ runtime route'
  )

  return lines.join('\n')
}
