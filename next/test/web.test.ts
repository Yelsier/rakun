import { describe, expect, it } from 'bun:test'

import {
  createRakunDatabaseWeb,
  createRakunGenerateStaticParams,
  getRakunPage,
  getRakunPageFromProps,
  getRakunParamsFromPath,
  getRakunStaticPaths,
} from '../src/web'

const staticPathsResponse = {
  items: [
    { path: '/', ttl: 86400 },
    { path: '/projects/rakun/', ttl: 86400 },
  ],
}

const fetchStaticPaths: typeof globalThis.fetch = async () => Response.json(staticPathsResponse)

describe('Rakun static params', () => {
  it('creates lazy database-backed web handlers', () => {
    let bootstrapRead = false
    const databaseWeb = createRakunDatabaseWeb({
      bootstrap: () => {
        bootstrapRead = true
        throw new Error('Bootstrap should stay lazy')
      },
    })

    expect(bootstrapRead).toBe(false)
    expect(typeof databaseWeb.generateStaticParams).toBe('function')
    expect(typeof databaseWeb.getPage).toBe('function')
    expect(typeof databaseWeb.getPageFromProps).toBe('function')
    expect(typeof databaseWeb.getStaticPaths).toBe('function')
  })

  it('converts paths for an optional catch-all segment', () => {
    expect(getRakunParamsFromPath({ path: '/' })).toEqual({})
    expect(getRakunParamsFromPath({ path: '/projects/rakun/' })).toEqual({
      slug: ['projects', 'rakun'],
    })
  })

  it('loads static paths from the public web endpoint', async () => {
    expect(
      await getRakunStaticPaths({
        apiBaseUrl: 'https://example.com/api/rakun',
        fetchOptions: { cache: 'no-store' },
        fetch: fetchStaticPaths,
      })
    ).toEqual(staticPathsResponse.items)
  })

  it('creates a generateStaticParams-compatible function', async () => {
    const generateStaticParams = createRakunGenerateStaticParams({
      apiBaseUrl: 'https://example.com/api/rakun',
      fetchOptions: { cache: 'no-store' },
      fetch: fetchStaticPaths,
    })

    expect(await generateStaticParams()).toEqual([{}, { slug: ['projects', 'rakun'] }])
  })

  it('uses ISR for static Rakun pages in production', async () => {
    const environment = process.env as Record<string, string | undefined>
    const previousNodeEnv = environment.NODE_ENV
    environment.NODE_ENV = 'production'
    const requests: Array<{ url: string; init?: RequestInit }> = []
    const fetchPage: typeof globalThis.fetch = async (input, init) => {
      const url = String(input)
      requests.push({ url, init })

      if (url.includes('/web/staticPaths')) {
        return Response.json({ items: [{ path: '/', ttl: 60 }] })
      }

      return Response.json({ renderMode: 'static', ttl: 60, modules: [] })
    }

    try {
      await getRakunPage({
        path: '/',
        apiBaseUrl: 'https://example.com/api/rakun',
        fetch: fetchPage,
      })
    } finally {
      environment.NODE_ENV = previousNodeEnv
    }

    expect(requests).toHaveLength(2)
    expect(requests[0]?.init).toMatchObject({
      cache: 'force-cache',
      next: {
        tags: ['rakun:static-paths'],
      },
    })
    expect(requests[1]?.init).toMatchObject({
      next: { revalidate: 60 },
    })
    expect(Array.from(new Headers(requests[1]?.init?.headers).entries())).toEqual([])
  })

  it('does not read search params while prerendering a static page', async () => {
    const environment = process.env as Record<string, string | undefined>
    const previousNodeEnv = environment.NODE_ENV
    environment.NODE_ENV = 'production'
    let searchParamsRead = false
    const searchParams = {
      then: (resolve: (value: { campaign: string }) => unknown) => {
        searchParamsRead = true
        return Promise.resolve(resolve({ campaign: 'summer' }))
      },
    } as unknown as Promise<{ campaign: string }>
    const fetchPage: typeof globalThis.fetch = async (input) =>
      String(input).includes('/web/staticPaths')
        ? Response.json({ items: [{ path: '/', ttl: 60 }] })
        : Response.json({ renderMode: 'static', ttl: 60, modules: [] })

    try {
      await getRakunPageFromProps(
        { params: Promise.resolve({}), searchParams },
        {
          apiBaseUrl: 'https://example.com/api/rakun',
          fetch: fetchPage,
        }
      )
    } finally {
      environment.NODE_ENV = previousNodeEnv
    }

    expect(searchParamsRead).toBe(false)
  })

  it('keeps production prerender behavior when Next debug mode sets NODE_ENV to development', async () => {
    const environment = process.env as Record<string, string | undefined>
    const previousNodeEnv = environment.NODE_ENV
    const previousNextPhase = environment.NEXT_PHASE
    environment.NODE_ENV = 'development'
    environment.NEXT_PHASE = 'phase-production-build'
    let searchParamsRead = false
    const searchParams = {
      then: (resolve: (value: { campaign: string }) => unknown) => {
        searchParamsRead = true
        return Promise.resolve(resolve({ campaign: 'summer' }))
      },
    } as unknown as Promise<{ campaign: string }>
    const fetchPage: typeof globalThis.fetch = async (input) =>
      String(input).includes('/web/staticPaths')
        ? Response.json({ items: [{ path: '/', ttl: 60 }] })
        : Response.json({ renderMode: 'static', ttl: 60, modules: [] })

    try {
      await getRakunPageFromProps(
        { params: Promise.resolve({}), searchParams },
        {
          apiBaseUrl: 'https://example.com/api/rakun',
          fetch: fetchPage,
        }
      )
    } finally {
      environment.NODE_ENV = previousNodeEnv
      environment.NEXT_PHASE = previousNextPhase
    }

    expect(searchParamsRead).toBe(false)
  })
})
