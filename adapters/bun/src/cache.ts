import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { normalizeRakunPath } from './config'
import { BoundedMemoryCache } from './memory-cache'
import type { RenderedRoute } from './types'

type StoredRoute = RenderedRoute & {
  generatedAt: string
}

type StoredRouteMetadata = Pick<StoredRoute, 'generatedAt' | 'path'>

export type RakunRouteCacheOptions = {
  idleTimeoutMs?: number
  maxBytes?: number
  maxEntries?: number
  maxGenerations?: number
}

const DEFAULT_ROUTE_CACHE_OPTIONS = {
  idleTimeoutMs: 5 * 60_000,
  maxBytes: 32 * 1024 * 1024,
  maxEntries: 128,
  maxGenerations: 2,
} as const

export const getRouteCacheKey = (path: string): string => {
  const normalized = normalizeRakunPath(path)
  return normalized === '/' ? '__root__' : Buffer.from(normalized).toString('base64url')
}

const readStoredRouteMetadata = async (directory: string): Promise<StoredRouteMetadata | null> => {
  try {
    const metadata = JSON.parse(
      await readFile(resolve(directory, 'route.json'), 'utf8')
    ) as StoredRouteMetadata
    return {
      generatedAt: metadata.generatedAt,
      path: normalizeRakunPath(metadata.path),
    }
  } catch {
    return null
  }
}

const readStoredRoute = async (directory: string): Promise<StoredRoute | null> => {
  try {
    const metadata = await readStoredRouteMetadata(directory)
    if (!metadata) return null
    const [html, flight] = await Promise.all([
      readFile(resolve(directory, 'index.html'), 'utf8'),
      readFile(resolve(directory, 'flight.rsc'), 'utf8'),
    ])

    return {
      generatedAt: metadata.generatedAt,
      path: normalizeRakunPath(metadata.path),
      html,
      flight: JSON.parse(flight) as RenderedRoute['flight'],
    }
  } catch {
    return null
  }
}

export class RakunRouteCache {
  private readonly entries: BoundedMemoryCache<string, RenderedRoute>
  private readonly loading = new Map<string, Promise<RenderedRoute | undefined>>()
  private readonly regenerating = new Map<string, Promise<RenderedRoute>>()
  private readonly latestDirectories = new Map<string, string>()
  private readonly maxGenerations: number

  constructor(
    private readonly rootDir: string,
    private readonly render: (path: string) => Promise<RenderedRoute>,
    options: RakunRouteCacheOptions = {}
  ) {
    const resolved = { ...DEFAULT_ROUTE_CACHE_OPTIONS, ...options }
    if (!Number.isSafeInteger(resolved.maxGenerations) || resolved.maxGenerations < 1) {
      throw new Error('maxGenerations must be a positive safe integer.')
    }
    this.maxGenerations = resolved.maxGenerations
    this.entries = new BoundedMemoryCache({
      idleTimeoutMs: resolved.idleTimeoutMs,
      maxBytes: resolved.maxBytes,
      maxEntries: resolved.maxEntries,
      sizeOf: (route) =>
        Buffer.byteLength(route.html) + Buffer.byteLength(JSON.stringify(route.flight)),
    })
  }

  get(path: string): RenderedRoute | undefined {
    return this.entries.get(normalizeRakunPath(path))
  }

  has(path: string): boolean {
    return this.entries.has(normalizeRakunPath(path))
  }

  remove(path: string): void {
    const normalized = normalizeRakunPath(path)
    this.entries.delete(normalized)
    this.latestDirectories.delete(normalized)
  }

  async getOrLoad(path: string): Promise<RenderedRoute | undefined> {
    const normalized = normalizeRakunPath(path)
    const cached = this.entries.get(normalized)
    if (cached) return cached

    const active = this.loading.get(normalized)
    if (active) return await active

    const directory = this.latestDirectories.get(normalized)
    if (!directory) return undefined
    const loading = (async () => {
      const stored = await readStoredRoute(directory)
      if (this.latestDirectories.get(normalized) !== directory) return undefined
      if (!stored) {
        this.latestDirectories.delete(normalized)
        return undefined
      }
      this.entries.set(normalized, stored)
      return stored
    })()
    this.loading.set(normalized, loading)
    try {
      return await loading
    } finally {
      if (this.loading.get(normalized) === loading) this.loading.delete(normalized)
    }
  }

  async load(): Promise<void> {
    this.entries.clear()
    this.latestDirectories.clear()
    const routeDirectories = await readdir(this.rootDir, {
      withFileTypes: true,
    }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw error
    })

    for (const routeDirectory of routeDirectories) {
      if (!routeDirectory.isDirectory()) continue
      const routeRoot = resolve(this.rootDir, routeDirectory.name)
      const generations = await readdir(routeRoot, { withFileTypes: true })
      let newest: { directory: string; metadata: StoredRouteMetadata } | null = null

      for (const generation of generations) {
        if (!generation.isDirectory() || generation.name.startsWith('.tmp-')) {
          continue
        }
        const directory = resolve(routeRoot, generation.name)
        const metadata = await readStoredRouteMetadata(directory)
        if (
          metadata &&
          (!newest || metadata.generatedAt.localeCompare(newest.metadata.generatedAt) > 0)
        ) {
          newest = { directory, metadata }
        }
      }

      if (newest) {
        this.latestDirectories.set(newest.metadata.path, newest.directory)
        await this.pruneGenerations(routeRoot, newest.directory).catch((error) => {
          console.error('Failed to prune old Rakun route cache generations.', error)
        })
      }
    }
  }

  async seed(route: RenderedRoute): Promise<void> {
    await this.persist(route)
    this.entries.set(normalizeRakunPath(route.path), route)
  }

  async regenerate(path: string): Promise<RenderedRoute> {
    const normalized = normalizeRakunPath(path)
    const active = this.regenerating.get(normalized)
    if (active) return await active

    const regeneration = (async () => {
      const next = await this.render(normalized)
      await this.persist(next)
      this.entries.set(normalized, next)
      return next
    })()
    this.regenerating.set(normalized, regeneration)

    try {
      return await regeneration
    } finally {
      this.regenerating.delete(normalized)
    }
  }

  clear(): void {
    this.entries.clear()
    this.loading.clear()
    this.latestDirectories.clear()
  }

  dispose(): void {
    this.entries.dispose()
    this.loading.clear()
    this.latestDirectories.clear()
  }

  private async persist(route: RenderedRoute): Promise<void> {
    const normalized = normalizeRakunPath(route.path)
    const routeRoot = resolve(this.rootDir, getRouteCacheKey(normalized))
    const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`
    const temporary = resolve(routeRoot, `.tmp-${id}`)
    const destination = resolve(routeRoot, id)
    await mkdir(temporary, { recursive: true })

    try {
      await Promise.all([
        writeFile(resolve(temporary, 'index.html'), route.html),
        writeFile(resolve(temporary, 'flight.rsc'), JSON.stringify(route.flight)),
        writeFile(
          resolve(temporary, 'route.json'),
          JSON.stringify({
            generatedAt: new Date().toISOString(),
            path: normalized,
          })
        ),
      ])
      await rename(temporary, destination)
    } catch (error) {
      await rm(temporary, { recursive: true, force: true })
      throw error
    }
    this.latestDirectories.set(normalized, destination)
    await this.pruneGenerations(routeRoot, destination).catch((error) => {
      console.error('Failed to prune old Rakun route cache generations.', error)
    })
  }

  private async pruneGenerations(routeRoot: string, current: string): Promise<void> {
    const generations = await readdir(routeRoot, { withFileTypes: true })
    const completed = generations
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.tmp-'))
      .map((entry) => resolve(routeRoot, entry.name))
      .sort()
      .reverse()
    const retained = new Set(
      [current, ...completed.filter((directory) => directory !== current)].slice(
        0,
        this.maxGenerations
      )
    )
    const obsolete = completed.filter((directory) => !retained.has(directory))
    await Promise.all(obsolete.map(async (directory) => await rm(directory, { recursive: true })))
  }
}
