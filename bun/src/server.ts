import { mkdirSync, watch, type FSWatcher } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { timingSafeEqual } from 'node:crypto'

import {
  ensureRakunBootstrap,
  ensureRakunInitialized,
  getRakunWebPage,
  getRakunWebStaticPaths,
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
import { createBunPlatform } from './platform'
import { renderRakunRoute } from './render'
import type {
  RakunBuildManifest,
  RakunBunBuildResult,
  RakunBunConfig,
  RakunBunWebSource,
  RakunServerModuleRegistry,
  RenderedRoute,
  ResolvedRakunBunConfig,
} from './types'

type BunWebSocketData = { kind: 'dev' }

type RakunBunInternalOptions = {
  cwd?: string
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

const getWebSource = (config: ResolvedRakunBunConfig): RakunBunWebSource =>
  config.web ?? {
    getPage: async (input) => await getRakunWebPage(input),
    getStaticPaths: async () => await getRakunWebStaticPaths(),
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

const serveAsset = async (config: ResolvedRakunBunConfig, request: Request): Promise<Response> => {
  const pathname = decodeURIComponent(new URL(request.url).pathname)
  const relative = pathname.replace(/^\/assets\/?/, '')
  const assetsRoot = resolve(config.outDir, 'assets')
  const path = resolve(assetsRoot, relative)
  if (path !== assetsRoot && !path.startsWith(`${assetsRoot}${sep}`)) {
    return new Response(null, { status: 404 })
  }
  const file = Bun.file(path)
  if (!(await file.exists())) return new Response(null, { status: 404 })
  return new Response(file, {
    headers: {
      'Cache-Control': config.server.development
        ? 'no-store'
        : 'public, max-age=31536000, immutable',
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
  private registry: RakunServerModuleRegistry
  private manifest?: RakunBuildManifest
  private cache: RakunRouteCache
  private staticPaths = new Set<string>()
  private server?: Bun.Server<BunWebSocketData>
  private watcher?: FSWatcher
  private prepared = false
  private readonly prebuilt: boolean

  constructor(config: RakunBunConfig, internal: RakunBunInternalOptions = {}) {
    this.config = resolveRakunConfig(config, internal.cwd)
    this.web = getWebSource(this.config)
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
    this.registry = code.registry
    this.manifest = code.manifest
    await this.refreshStaticPaths()

    for (const path of this.staticPaths) {
      await this.cache.regenerate(path)
    }
    await writeRakunManifests(this.config.outDir, this.manifest, Array.from(this.staticPaths))
    this.prepared = true
    return describeBuild(this.config, this.manifest, Array.from(this.staticPaths))
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
        return await this.api(request, segments)
      }

      if (pathname === normalizeRevalidationPath(this.config.revalidation?.path)) {
        return await this.handleRevalidation(request)
      }
      if (pathname === '/assets' || pathname.startsWith('/assets/')) {
        return await serveAsset(this.config, request)
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
      return await this.handlePage(request, pathname)
    })
  }

  async serve(): Promise<Bun.Server<BunWebSocketData>> {
    await this.prepare()
    const routes = {
      [`${this.config.apiBasePath}/*`]: (request: Request) => this.fetch(request),
      [`${this.config.apiBasePath}`]: (request: Request) => this.fetch(request),
      '/_rakun/revalidate': (request: Request) => this.fetch(request),
      '/_rakun/rsc/*': (request: Request) => this.fetch(request),
      '/_rakun/dev': (request: Request) =>
        this.server?.upgrade(request, { data: { kind: 'dev' } })
          ? undefined
          : new Response(null, { status: 426 }),
      '/assets/*': (request: Request) => this.fetch(request),
      '/*': (request: Request) => this.fetch(request),
    }
    this.server = Bun.serve<BunWebSocketData>({
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
    if (this.config.server.development) this.startWatcher()
    return this.server
  }

  stop(): void {
    this.watcher?.close()
    this.watcher = undefined
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
      registry: this.registry,
    })
  }

  private async getRoute(request: Request, path: string): Promise<RenderedRoute> {
    if (this.staticPaths.has(path)) {
      const cached = this.cache.get(path)
      if (cached) return cached
      return await this.cache.regenerate(path)
    }
    return await this.renderPath(path, getRequestPageInput(request, path))
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
        'Cache-Control': this.staticPaths.has(path) ? 'public' : 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }

  private async handleFlight(request: Request, path: string): Promise<Response> {
    const route = await this.getRoute(request, path)
    return new Response(JSON.stringify(route.flight), {
      headers: {
        'Cache-Control': this.staticPaths.has(path) ? 'public' : 'no-store',
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
    mkdirSync(this.config.modulesDir, { recursive: true })
    this.watcher = watch(this.config.modulesDir, { recursive: true }, () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void this.rebuildForDevelopment()
      }, 75)
    })
  }

  private async rebuildForDevelopment(): Promise<void> {
    try {
      const code = await buildRakunCode(this.config)
      this.registry = code.registry
      this.manifest = code.manifest
      await this.refreshStaticPaths()
      for (const path of this.staticPaths) await this.cache.regenerate(path)
      this.server?.publish('rakun-dev', 'update')
    } catch (error) {
      console.error('Rakun development rebuild failed.', error)
    }
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
