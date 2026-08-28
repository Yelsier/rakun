import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { normalizeRakunPath } from './config'
import type { RenderedRoute } from './types'

type StoredRoute = RenderedRoute & {
  generatedAt: string
}

export const getRouteCacheKey = (path: string): string => {
  const normalized = normalizeRakunPath(path)
  return normalized === '/' ? '__root__' : Buffer.from(normalized).toString('base64url')
}

const readStoredRoute = async (directory: string): Promise<StoredRoute | null> => {
  try {
    const metadata = JSON.parse(await readFile(resolve(directory, 'route.json'), 'utf8')) as Pick<
      StoredRoute,
      'generatedAt' | 'path'
    >
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
  private readonly entries = new Map<string, RenderedRoute>()
  private readonly regenerating = new Map<string, Promise<RenderedRoute>>()

  constructor(
    private readonly rootDir: string,
    private readonly render: (path: string) => Promise<RenderedRoute>
  ) {}

  get(path: string): RenderedRoute | undefined {
    return this.entries.get(normalizeRakunPath(path))
  }

  has(path: string): boolean {
    return this.entries.has(normalizeRakunPath(path))
  }

  remove(path: string): void {
    this.entries.delete(normalizeRakunPath(path))
  }

  async load(): Promise<void> {
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
      let newest: StoredRoute | null = null

      for (const generation of generations) {
        if (!generation.isDirectory() || generation.name.startsWith('.tmp-')) {
          continue
        }
        const stored = await readStoredRoute(resolve(routeRoot, generation.name))
        if (stored && (!newest || stored.generatedAt.localeCompare(newest.generatedAt) > 0)) {
          newest = stored
        }
      }

      if (newest) this.entries.set(newest.path, newest)
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
  }
}
