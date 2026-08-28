import { mkdirSync, watch, type FSWatcher } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { timingSafeEqual } from 'node:crypto'

import {
  ensureRakunBootstrap,
  ensureRakunInitialized,
  getRakunWebPage,
  getRakunWebPreviewPage,
  getRakunWebStaticPaths,
  getPlatform,
  handlePublicMediaRequest,
  isRealtimeEndpointRequest,
  recordApiError,
  runWithRakunRequestTrace,
  type RakunBootstrapOptions,
} from '@rakun-kit/core'
import type { PageInput } from '@rakun-kit/core/contracts'

import { createRakunApiHandler } from './api'
import { buildRakunCode, describeBuild, writeRakunManifests } from './build'
import { RakunRouteCache } from './cache'
import { normalizeRakunPath, resolveRakunConfig } from './config'
import { jsonResponse } from './http'
import { hasUseClientDirective } from './modules'
import { createBunPlatform } from './platform'
import { renderRakunRoute } from './render'
import type {
  RakunBuildManifest,
  RakunBunBuildResult,
  RakunBunConfig,
  RakunBunDocumentImport,
  RakunBunWebSource,
  RakunServerModuleRegistry,
  RenderedRoute,
  ResolvedRakunBunConfig,
} from './types'

type BunWebSocketData = { kind: 'dev' }

type RakunBunInternalOptions = {
  cwd?: string
  document?: RakunBunDocumentImport
  registry?: RakunServerModuleRegistry
}

const normalizeRevalidationPath = (value: string | undefined): string => {
  const path = value?.trim() || '/_rakun/revalidate'
  return path.startsWith('/') ? path : `/${path}`
}

const secureTokenEquals = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
}

const loadBuildManifest = async (outDir: string): Promise<RakunBuildManifest> =>
  JSON.parse(
    await readFile(resolve(outDir, 'manifests', 'build.json'), 'utf8')
  ) as RakunBuildManifest

const getPreviewToken = (config: ResolvedRakunBunConfig, input: PageInput): string | undefined => {
  const tokenParam =
    config.manager !== false && config.manager.preview !== false
      ? config.manager.preview.tokenParam
      : 'rakun_preview'
  return input.search ? (new URLSearchParams(input.search).get(tokenParam) ?? undefined) : undefined
}

const getWebSource = (config: ResolvedRakunBunConfig): RakunBunWebSource => {
  if (config.web) return config.web

  return {
    getPage: async (input) => {
      const token = getPreviewToken(config, input)
      return token
        ? await getRakunWebPreviewPage({ ...input, token })
        : await getRakunWebPage(input)
    },
    getStaticPaths: async () => await getRakunWebStaticPaths(),
  }
}

const withBunBootstrap = (
  bootstrap: RakunBootstrapOptions,
  config: ResolvedRakunBunConfig,
  origin: string
): RakunBootstrapOptions => ({
  ...bootstrap,
  platform: bootstrap.platform ?? createBunPlatform(),
  revalidate: config.revalidation
    ? {
        token: config.revalidation.token,
        url: `${origin}${normalizeRevalidationPath(config.revalidation.path)}`,
      }
    : bootstrap.revalidate,
})

const applyBootstrap = (config: ResolvedRakunBunConfig, origin: string): void => {
  if (!config.bootstrap) return
  const options = typeof config.bootstrap === 'function' ? config.bootstrap() : config.bootstrap
  ensureRakunBootstrap(withBunBootstrap(options, config, origin))
}

const getRequestPageInput = (request: Request, path: string): PageInput => ({
  path,
  search: new URL(request.url).search || undefined,
  headers: Object.fromEntries(request.headers.entries()),
})

const getStatus = (route: RenderedRoute): number => {
  if (route.flight.redirect) return route.flight.redirect.status
  const notFound = route.flight.html.includes('data-rakun-not-found')
  return notFound ? 404 : 200
}

const acceptsGzip = (request: Request): boolean => {
  const encodings = new Map(
    (request.headers.get('Accept-Encoding') ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .map((value) => {
        const [encoding, ...parameters] = value.split(';').map((part) => part.trim())
        const quality = parameters.find((parameter) => parameter.startsWith('q='))?.slice(2)
        return [encoding, quality === undefined ? 1 : Number(quality)] as const
      })
  )
  return (encodings.get('gzip') ?? encodings.get('*') ?? 0) > 0
}

const isCompressibleAsset = (file: Bun.BunFile): boolean =>
  file.size >= 1_024 &&
  /^(?:text\/|application\/(?:javascript|json|wasm|xml)|image\/svg\+xml)/.test(file.type)

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

const serveAsset = async (
  config: ResolvedRakunBunConfig,
  request: Request,
  compressedAssets: Map<string, ArrayBuffer>
): Promise<Response> => {
  const pathname = decodeURIComponent(new URL(request.url).pathname)
  const relative = pathname.replace(/^\/assets\/?/, '')
  const assetsRoot = resolve(config.outDir, 'assets')
  const path = resolve(assetsRoot, relative)
  if (path !== assetsRoot && !path.startsWith(`${assetsRoot}${sep}`)) {
    return new Response(null, { status: 404 })
  }
  const file = Bun.file(path)
  if (!(await file.exists())) return new Response(null, { status: 404 })
  const headers = new Headers({
    'Cache-Control': config.server.development ? 'no-store' : 'public, max-age=31536000, immutable',
    'Content-Type': file.type,
  })

  if (!config.server.development && isCompressibleAsset(file)) {
    headers.set('Vary', 'Accept-Encoding')
    if (acceptsGzip(request)) {
      let compressed = compressedAssets.get(path)
      if (!compressed) {
        compressed = toArrayBuffer(Bun.gzipSync(await file.bytes()))
        compressedAssets.set(path, compressed)
      }
      headers.set('Content-Encoding', 'gzip')
      return new Response(compressed, { headers })
    }
  }

  return new Response(file, {
    headers,
  })
}

const servePublicFile = async (
  config: ResolvedRakunBunConfig,
  request: Request,
  prebuilt: boolean
): Promise<Response | null> => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null

  let pathname: string
  try {
    pathname = decodeURIComponent(new URL(request.url).pathname)
  } catch {
    return new Response(null, { status: 404 })
  }
  const relative = pathname.replace(/^\/+/, '')
  if (!relative) return null

  const publicRoot = resolve(prebuilt ? config.outDir : config.rootDir, 'public')
  const path = resolve(publicRoot, relative)
  if (path !== publicRoot && !path.startsWith(`${publicRoot}${sep}`)) {
    return new Response(null, { status: 404 })
  }

  const file = Bun.file(path)
  if (!(await file.exists())) return null

  return new Response(request.method === 'HEAD' ? null : file, {
    headers: {
      'Cache-Control': config.server.development ? 'no-store' : 'public, max-age=0',
      'Content-Type': file.type,
    },
  })
}

const managerHtml = (config: ResolvedRakunBunConfig, manifest: RakunBuildManifest): string => {
  const styles = manifest.managerAssets
    .filter((asset) => asset.endsWith('.css'))
    .map((asset) => `<link rel="stylesheet" href="${asset}">`)
    .join('')
  const scripts = manifest.managerAssets
    .filter((asset) => asset.endsWith('.js'))
    .map((asset) => `<script type="module" src="${asset}"></script>`)
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}</head><body><div id="rakun-manager-root"></div>${scripts}</body></html>`
}

export class RakunBunApplication {
  readonly config: ResolvedRakunBunConfig
  private readonly web: RakunBunWebSource
  private readonly api = createRakunApiHandler()
  private document?: RakunBunDocumentImport
  private registry: RakunServerModuleRegistry
  private manifest?: RakunBuildManifest
  private cache: RakunRouteCache
  private staticPaths = new Set<string>()
  private server?: Bun.Server<BunWebSocketData>
  private watchers: FSWatcher[] = []
  private developmentRebuild?: Promise<void>
  private queuedDevelopmentRebuild = false
  private pendingDevelopmentFiles = new Set<string>()
  private pendingDevelopmentUnknown = false
  private prepared = false
  private readonly prebuilt: boolean
  private readonly compressedAssets = new Map<string, ArrayBuffer>()

  constructor(config: RakunBunConfig, internal: RakunBunInternalOptions = {}) {
    this.config = resolveRakunConfig(config, internal.cwd)
    this.web = getWebSource(this.config)
    this.document = internal.document
    this.registry = internal.registry ?? {}
    this.prebuilt = internal.registry !== undefined
    this.cache = new RakunRouteCache(
      resolve(this.config.outDir, 'routes'),
      async (path) => await this.renderPath(path)
    )
  }

  async build(options: { clean?: boolean } = {}): Promise<RakunBunBuildResult> {
    await this.prepareBootstrap()
    const code = await buildRakunCode(this.config, options)
    this.document = code.document
    this.registry = code.registry
    this.manifest = code.manifest
    this.compressedAssets.clear()
    await this.refreshStaticPaths()

    const routes: RenderedRoute[] = []
    for (const path of this.staticPaths) routes.push(await this.cache.regenerate(path))
    await writeRakunManifests(this.config.outDir, this.manifest, Array.from(this.staticPaths))
    this.prepared = true
    return describeBuild(this.config, this.manifest, routes)
  }

  async invalidatePath(path: string): Promise<void> {
    await this.prepare()
    const normalized = normalizeRakunPath(path)
    await this.refreshStaticPaths()
    if (!this.staticPaths.has(normalized)) {
      this.cache.remove(normalized)
      return
    }
    await this.cache.regenerate(normalized)
  }

  async fetch(request: Request): Promise<Response> {
    await this.prepare()
    const url = new URL(request.url)
    const pathname = normalizeRakunPath(url.pathname)

    return await runWithRakunRequestTrace(request.method, url.pathname, async () => {
      if (
        pathname === this.config.apiBasePath ||
        pathname.startsWith(`${this.config.apiBasePath}/`)
      ) {
        const segments = pathname.slice(this.config.apiBasePath.length).split('/').filter(Boolean)
        if (request.method === 'GET' && segments.join('/') === 'health') {
          return jsonResponse({ ok: true }, 200, { 'Cache-Control': 'no-store' })
        }
        if (
          (request.method === 'GET' || request.method === 'HEAD') &&
          segments[0] === 'media'
        ) {
          const publicMediaResponse = await handlePublicMediaRequest({
            request,
            pathSegments: segments.slice(1),
          })
          if (publicMediaResponse) return publicMediaResponse
        }
        return await this.api(request, segments)
      }

      if (pathname === normalizeRevalidationPath(this.config.revalidation?.path)) {
        return await this.handleRevalidation(request)
      }
      if (pathname === '/assets' || pathname.startsWith('/assets/')) {
        return await serveAsset(this.config, request, this.compressedAssets)
      }
      if (pathname === '/_rakun/rsc' || pathname.startsWith('/_rakun/rsc/')) {
        const pagePath = normalizeRakunPath(url.pathname.slice('/_rakun/rsc'.length) || '/')
        return await this.handleFlight(request, pagePath)
      }
      if (
        this.config.manager &&
        (pathname === this.config.manager.basePath ||
          pathname.startsWith(`${this.config.manager.basePath}/`))
      ) {
        return new Response(managerHtml(this.config, this.getManifest()), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }
      if (pathname === '/_rakun/dev') {
        return new Response(null, { status: 426 })
      }
      const publicFile = await servePublicFile(this.config, request, this.prebuilt)
      if (publicFile) return publicFile
      return await this.handlePage(request, pathname)
    })
  }

  async serve(): Promise<Bun.Server<BunWebSocketData>> {
    await this.prepare()
    let server: Bun.Server<BunWebSocketData> | undefined
    const handleRequest = (request: Request): Response | Promise<Response> => {
      const metadata = getPlatform().realtime.metadata
      if (
        metadata.transport === 'sse' &&
        isRealtimeEndpointRequest({
          basePath: this.config.apiBasePath,
          endpoint: metadata.endpoint,
          method: request.method,
          requestUrl: request.url,
        })
      ) {
        server?.timeout(request, 0)
      }

      return this.fetch(request)
    }
    const routes = {
      [`${this.config.apiBasePath}/*`]: handleRequest,
      [`${this.config.apiBasePath}`]: handleRequest,
      '/_rakun/revalidate': handleRequest,
      '/_rakun/rsc/*': handleRequest,
      '/_rakun/dev': (request: Request) =>
        this.server?.upgrade(request, { data: { kind: 'dev' } })
          ? undefined
          : new Response(null, { status: 426 }),
      '/assets/*': handleRequest,
      '/*': handleRequest,
    }
    server = Bun.serve<BunWebSocketData>({
      development: this.config.server.development,
      hostname: this.config.server.hostname,
      port: this.config.server.port,
      routes,
      websocket: {
        open(socket) {
          socket.subscribe('rakun-dev')
        },
        message() {},
      },
    })
    this.server = server
    if (this.config.server.development) this.startWatcher()
    return this.server
  }

  stop(): void {
    for (const watcher of this.watchers) watcher.close()
    this.watchers = []
    this.server?.stop()
    this.server = undefined
  }

  private async prepareBootstrap(): Promise<void> {
    const protocol = 'http:'
    const host =
      this.config.server.hostname === '0.0.0.0' ? '127.0.0.1' : this.config.server.hostname
    applyBootstrap(this.config, `${protocol}//${host}:${this.config.server.port}`)
    if (this.config.bootstrap) await ensureRakunInitialized()
  }

  private async prepare(): Promise<void> {
    if (this.prepared) return
    await this.prepareBootstrap()
    if (this.prebuilt) {
      this.manifest = await loadBuildManifest(this.config.outDir)
      await this.cache.load()
      await this.refreshStaticPaths()
    } else {
      await this.build()
    }
    this.prepared = true
  }

  private getManifest(): RakunBuildManifest {
    if (!this.manifest) throw new Error('Rakun Bun application is not prepared.')
    return this.manifest
  }

  private async refreshStaticPaths(): Promise<void> {
    const output = await this.web.getStaticPaths()
    this.staticPaths = new Set(output.items.map((item) => normalizeRakunPath(item.path)))
  }

  private async renderPath(path: string, input: PageInput = { path }): Promise<RenderedRoute> {
    const page = await this.web.getPage(input)
    return await renderRakunRoute({
      config: this.config,
      manifest: this.getManifest(),
      page,
      path,
      document: this.document,
      registry: this.registry,
    })
  }

  private async getRoute(request: Request, path: string): Promise<RenderedRoute> {
    const input = getRequestPageInput(request, path)
    if (getPreviewToken(this.config, input)) return await this.renderPath(path, input)

    if (this.staticPaths.has(path)) {
      const cached = this.cache.get(path)
      if (cached) return cached
      return await this.cache.regenerate(path)
    }
    return await this.renderPath(path, input)
  }

  private async handlePage(request: Request, path: string): Promise<Response> {
    const route = await this.getRoute(request, path)
    if (route.flight.redirect) {
      return Response.redirect(
        new URL(route.flight.redirect.to, request.url),
        route.flight.redirect.status
      )
    }
    return new Response(route.html, {
      status: getStatus(route),
      headers: {
        'Cache-Control':
          this.staticPaths.has(path) &&
          !getPreviewToken(this.config, getRequestPageInput(request, path))
            ? 'public, max-age=0, must-revalidate'
            : 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }

  private async handleFlight(request: Request, path: string): Promise<Response> {
    const route = await this.getRoute(request, path)
    return new Response(JSON.stringify(route.flight), {
      headers: {
        'Cache-Control':
          this.staticPaths.has(path) &&
          !getPreviewToken(this.config, getRequestPageInput(request, path))
            ? 'public, max-age=0, must-revalidate'
            : 'no-store',
        'Content-Type': 'text/x-component; charset=utf-8',
      },
    })
  }

  private async handleRevalidation(request: Request): Promise<Response> {
    if (!this.config.revalidation) {
      return await this.revalidationError('Path revalidation is not configured', 404)
    }
    if (request.method !== 'POST') {
      return await this.revalidationError('Method not allowed', 405)
    }
    const authorization = request.headers.get('authorization')
    const expected = `Bearer ${this.config.revalidation.token}`
    if (!authorization || !secureTokenEquals(authorization, expected)) {
      return await this.revalidationError('Unauthorized', 401)
    }
    const value: unknown = await request.json().catch(() => null)
    if (
      !value ||
      typeof value !== 'object' ||
      !('path' in value) ||
      typeof value.path !== 'string'
    ) {
      return await this.revalidationError('A string path is required', 400)
    }
    try {
      await this.invalidatePath(value.path)
      return jsonResponse({ revalidated: true, path: normalizeRakunPath(value.path) })
    } catch (error) {
      await recordApiError({
        name: 'framework.revalidatePath',
        error,
        statusCode: 500,
        boundary: true,
      })
      return jsonResponse({ message: 'Path regeneration failed' }, 500)
    }
  }

  private async revalidationError(message: string, statusCode: number): Promise<Response> {
    await recordApiError({
      name: 'framework.revalidatePath',
      error: new Error(message),
      statusCode,
      boundary: true,
    })
    return jsonResponse({ message }, statusCode)
  }

  private startWatcher(): void {
    let timer: ReturnType<typeof setTimeout> | undefined
    const sourceDir = dirname(this.config.documentFile)
    const candidates = Array.from(new Set([sourceDir, this.config.modulesDir]))
    const roots = candidates.filter(
      (candidate, index, candidates) =>
        !candidates.some(
          (parent, parentIndex) =>
            parentIndex !== index && candidate !== parent && candidate.startsWith(`${parent}${sep}`)
        )
    )
    const rebuild = (root: string, filename: string | Buffer | null) => {
      if (filename === null) {
        this.pendingDevelopmentUnknown = true
      } else {
        this.pendingDevelopmentFiles.add(resolve(root, filename.toString()))
      }
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        this.scheduleDevelopmentRebuild()
      }, 75)
    }

    for (const root of roots) {
      mkdirSync(root, { recursive: true })
      this.watchers.push(
        watch(root, { recursive: true }, (eventType, filename) => rebuild(root, filename))
      )
    }
  }

  private scheduleDevelopmentRebuild(): void {
    if (this.developmentRebuild) {
      this.queuedDevelopmentRebuild = true
      return
    }

    this.developmentRebuild = this.rebuildForDevelopment().finally(() => {
      this.developmentRebuild = undefined
      if (!this.queuedDevelopmentRebuild || !this.server) return

      this.queuedDevelopmentRebuild = false
      this.scheduleDevelopmentRebuild()
    })
  }

  private async rebuildForDevelopment(): Promise<void> {
    try {
      const buildClient = await this.consumeDevelopmentClientBuild()
      const previousStaticPaths = this.staticPaths
      const code = await buildRakunCode(this.config, {
        client: buildClient,
        previousManifest: this.manifest,
      })
      this.document = code.document
      this.registry = code.registry
      this.manifest = code.manifest
      await this.refreshStaticPaths()
      for (const path of new Set([...previousStaticPaths, ...this.staticPaths])) {
        this.cache.remove(path)
      }
      await writeRakunManifests(this.config.outDir, this.manifest, Array.from(this.staticPaths))
      this.server?.publish('rakun-dev', 'update')
    } catch (error) {
      console.error('Rakun development rebuild failed.', error)
    }
  }

  private async consumeDevelopmentClientBuild(): Promise<boolean | string[]> {
    const unknown = this.pendingDevelopmentUnknown
    const files = Array.from(this.pendingDevelopmentFiles)
    this.pendingDevelopmentUnknown = false
    this.pendingDevelopmentFiles.clear()
    if (unknown) return true

    const clientModules = new Set<string>()
    for (const file of files) {
      if (file === resolve(this.config.documentFile)) continue
      const moduleRelative = relative(this.config.modulesDir, file)
      if (moduleRelative.startsWith('..') || moduleRelative.includes(`${sep}..${sep}`)) {
        continue
      }
      const parts = moduleRelative.split(sep)
      const isModuleEntry =
        parts.length === 1 || (parts.length === 2 && /^index\.[^.]+$/.test(parts.at(-1) ?? ''))
      if (!isModuleEntry) return true
      const source = await readFile(file, 'utf8').catch(() => undefined)
      if (source === undefined) {
        const previous = this.manifest?.modules.find((module) => module.file === file)
        if (previous?.client) clientModules.add(previous.name)
        continue
      }
      if (hasUseClientDirective(source)) {
        const previous = this.manifest?.modules.find((module) => module.file === file)
        if (!previous) return true
        clientModules.add(previous.name)
      }
    }

    return Array.from(clientModules)
  }
}

export const createRakunBun = (
  config: RakunBunConfig,
  internal: RakunBunInternalOptions = {}
): RakunBunApplication => new RakunBunApplication(config, internal)

export const startRakunBun = async (
  config: RakunBunConfig,
  internal: RakunBunInternalOptions = {}
): Promise<RakunBunApplication> => {
  const application = createRakunBun(config, internal)
  const server = await application.serve()
  console.log(`Rakun listening on ${server.url}`)
  return application
}
