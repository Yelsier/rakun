import { headers as nextHeaders } from 'next/headers'
import { unstable_cache } from 'next/cache'
import type { Metadata, MetadataRoute } from 'next'
import {
  ensureRakunInitialized,
  getRakunWebPage,
  getRakunWebPreviewPage,
  getRakunWebStaticPaths,
  type RakunBootstrapOptions,
} from '@rakun-kit/core'
import {
  DEFAULT_STATIC_PAGE_TTL,
  type PageOutput,
  type LlmsOutput,
  type RobotsOutput,
  type SitemapOutput,
  type StaticPathOutput,
  type StaticPathsOutput,
} from '@rakun-kit/core/contracts'

export {
  getCurrentPageInfo,
  getCurrentPageLiterals,
  getLocaleFromInfo,
  getLiteralsFromInfo,
  PageInfoClientSync,
  PageInfoProvider,
  runWithPageInfo,
  tFromInfo,
  usePageInfo,
  useT,
  type PageInfo,
  type PageLiterals,
  type TFromInfoArgs,
  type TranslationValues,
} from './translation'

import { markRakunPreviewPage } from './web-preview'
import { RAKUN_STATIC_PATHS_CACHE_TAG } from './web-cache'
import { applyRakunBootstrap } from './bootstrap'

export { RAKUN_STATIC_PATHS_CACHE_TAG } from './web-cache'

export {
  RakunPageRenderer,
  type RakunPageModuleImport,
  type RakunPageModuleLoader,
  type RakunPageRendererProps,
} from './web-renderer'

export type RakunNextPageSearchParams = Record<string, string | string[] | undefined>

export type RakunNextPageParams = Record<string, string | string[] | undefined>

export type RakunNextPageProps = {
  params: Promise<RakunNextPageParams>
  searchParams?: Promise<RakunNextPageSearchParams>
}

export type RakunNextFetchOptions = RequestInit & {
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
}

export type GetRakunPageOptions = {
  path: string
  apiBaseUrl?: string | URL
  search?: string | URLSearchParams | RakunNextPageSearchParams
  previewTokenParam?: string
  headers?: HeadersInit
  forwardHeaders?: boolean
  autoCache?: boolean
  staticPathsFetchOptions?: RakunNextFetchOptions
  fetchOptions?: RakunNextFetchOptions
  fetch?: typeof globalThis.fetch
}

export type GetRakunStaticPathsOptions = {
  apiBaseUrl?: string | URL
  headers?: HeadersInit
  forwardHeaders?: boolean
  fetchOptions?: RakunNextFetchOptions
  fetch?: typeof globalThis.fetch
}

export type GetRakunParamsFromPathOptions = {
  path: string
  paramKey?: string
  basePath?: string
}

export type CreateRakunGenerateStaticParamsOptions = GetRakunStaticPathsOptions & {
  paramKey?: string
  basePath?: string
}

export type CreateRakunDatabaseWebOptions = {
  bootstrap: RakunBootstrapOptions | (() => RakunBootstrapOptions)
  paramKey?: string
  basePath?: string
}

export type GetRakunDatabasePageOptions = Pick<
  GetRakunPageOptions,
  'path' | 'search' | 'previewTokenParam' | 'headers' | 'forwardHeaders' | 'autoCache'
>

export type GetRakunDatabasePageFromPropsOptions = Omit<
  GetRakunDatabasePageOptions,
  'path' | 'search'
>

export type GetRakunPageFromPropsOptions = Omit<GetRakunPageOptions, 'path' | 'search'> & {
  paramKey?: string
  basePath?: string
}

export type GetRakunSitemapOptions = {
  apiBaseUrl?: string | URL
  siteUrl?: string | URL
  language?: string
  headers?: HeadersInit
  forwardHeaders?: boolean
  fetchOptions?: RakunNextFetchOptions
  fetch?: typeof globalThis.fetch
}

export type RakunSitemapRouteHandlerContext = {
  params: Promise<Record<string, string | string[] | undefined>>
}

export type CreateRakunSitemapIndexRouteHandlerOptions = Omit<
  GetRakunSitemapOptions,
  'language'
> & {
  sitemapPath?: (language: string) => string
}

export type CreateRakunLocaleSitemapRouteHandlerOptions = GetRakunSitemapOptions & {
  paramKey?: string
}

export type GetRakunRobotsTxtOptions = {
  apiBaseUrl?: string | URL
  headers?: HeadersInit
  forwardHeaders?: boolean
  fetchOptions?: RakunNextFetchOptions
  fetch?: typeof globalThis.fetch
}

export type GetRakunLlmsTxtOptions = {
  apiBaseUrl?: string | URL
  language?: string
  headers?: HeadersInit
  forwardHeaders?: boolean
  fetchOptions?: RakunNextFetchOptions
  fetch?: typeof globalThis.fetch
}

export type CreateRakunLocaleLlmsTxtRouteHandlerOptions = GetRakunLlmsTxtOptions & {
  paramKey?: string
}

export type GetRakunPathFromParamsOptions = {
  params: RakunNextPageParams
  paramKey?: string
  basePath?: string
}

type RakunMetadataImage = {
  url?: string
  width?: number | null
  height?: number | null
  alt?: string | null
  title?: string
}

const defaultApiBaseUrl = '/api/rakun'
const defaultParamKey = 'slug'
const defaultPreviewTokenParam = 'rakun_preview'
const isProductionRendering = () =>
  process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build'

const blockedForwardHeaders = new Set(['connection', 'content-length', 'host', 'transfer-encoding'])

const normalizePath = (path: string): string => {
  if (!path) return '/'
  return path.startsWith('/') ? path : `/${path}`
}

const normalizeBasePath = (path: string): string =>
  path === '/' ? '' : path.replace(/^\/+|\/+$/g, '')

const normalizeComparablePath = (path: string): string => {
  const normalized = normalizePath(path).replace(/\/+$/g, '')
  return normalized || '/'
}

const normalizeJsonOutput = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const searchToString = (search: GetRakunPageOptions['search']): string | undefined => {
  if (!search) return undefined

  if (typeof search === 'string') {
    return search.startsWith('?') ? search : `?${search}`
  }

  const searchParams = search instanceof URLSearchParams ? search : new URLSearchParams()

  if (!(search instanceof URLSearchParams)) {
    for (const [key, value] of Object.entries(search)) {
      if (typeof value === 'undefined') continue

      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(key, item)
        }
        continue
      }

      searchParams.set(key, value)
    }
  }

  const value = searchParams.toString()
  return value ? `?${value}` : undefined
}

const searchToURLSearchParams = (search: GetRakunPageOptions['search']): URLSearchParams => {
  if (!search) return new URLSearchParams()

  if (typeof search === 'string') {
    return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  }

  if (search instanceof URLSearchParams) {
    return new URLSearchParams(search)
  }

  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(search)) {
    if (typeof value === 'undefined') continue

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item)
      }
      continue
    }

    searchParams.set(key, value)
  }

  return searchParams
}

const extractPreviewSearch = (search: GetRakunPageOptions['search'], tokenParam: string) => {
  const searchParams = searchToURLSearchParams(search)
  const token = searchParams.get(tokenParam) ?? undefined

  if (token) {
    searchParams.delete(tokenParam)
  }

  return {
    token,
    search: searchParams.toString() ? searchParams : undefined,
  }
}

const getRequestOrigin = async (): Promise<string> => {
  const requestHeaders = await nextHeaders()
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')

  if (!host) {
    throw new Error(
      'Cannot resolve relative Rakun API URL without a request host. Pass an absolute apiBaseUrl.'
    )
  }

  const protocol =
    requestHeaders.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')

  return `${protocol}://${host}`
}

const resolveApiBaseUrl = async (apiBaseUrl: string | URL): Promise<URL> => {
  if (apiBaseUrl instanceof URL) return apiBaseUrl

  try {
    return new URL(apiBaseUrl)
  } catch {
    return new URL(apiBaseUrl, await getRequestOrigin())
  }
}

const resolveSiteUrl = async (siteUrl?: string | URL): Promise<URL> => {
  if (siteUrl instanceof URL) return siteUrl
  if (typeof siteUrl === 'string') return new URL(siteUrl)
  return new URL(await getRequestOrigin())
}

const createForwardHeaders = async (): Promise<Headers> => {
  const output = new Headers()
  const requestHeaders = await nextHeaders()

  for (const [name, value] of requestHeaders.entries()) {
    if (blockedForwardHeaders.has(name.toLowerCase())) continue
    output.set(name, value)
  }

  return output
}

const createRequestHeaders = async ({
  headers,
  forwardHeaders,
}: Pick<GetRakunPageOptions, 'headers' | 'forwardHeaders'>) => {
  const output = forwardHeaders === false ? new Headers() : await createForwardHeaders()

  if (headers) {
    for (const [name, value] of new Headers(headers).entries()) {
      output.set(name, value)
    }
  }

  return output
}

export const getRakunPathFromParams = ({
  params,
  paramKey = defaultParamKey,
  basePath = '',
}: GetRakunPathFromParamsOptions): string => {
  const rawValue = params[paramKey] ?? Object.values(params).find(Boolean)
  const segments = Array.isArray(rawValue)
    ? rawValue
    : typeof rawValue === 'string'
      ? [rawValue]
      : []
  const normalizedBasePath = normalizeBasePath(basePath)
  const pathSegments = [
    ...(normalizedBasePath ? [normalizedBasePath] : []),
    ...segments.filter(Boolean),
  ]

  return normalizePath(pathSegments.join('/'))
}

export const getRakunParamsFromPath = ({
  path,
  paramKey = defaultParamKey,
  basePath = '',
}: GetRakunParamsFromPathOptions): RakunNextPageParams | null => {
  const pathSegments = normalizeComparablePath(path).split('/').filter(Boolean)
  const baseSegments = normalizeBasePath(basePath).split('/').filter(Boolean)

  if (baseSegments.some((segment, index) => pathSegments[index] !== segment)) {
    return null
  }

  const segments = pathSegments.slice(baseSegments.length)
  return { [paramKey]: segments }
}

const getDefaultStaticPathsFetchOptions = (): RakunNextFetchOptions =>
  isProductionRendering()
    ? {
        cache: 'force-cache',
        next: {
          revalidate: DEFAULT_STATIC_PAGE_TTL,
          tags: [RAKUN_STATIC_PATHS_CACHE_TAG],
        },
      }
    : { cache: 'no-store' }

export const getRakunStaticPaths = async ({
  apiBaseUrl = defaultApiBaseUrl,
  headers,
  forwardHeaders = false,
  fetchOptions,
  fetch: fetchFn = globalThis.fetch,
}: GetRakunStaticPathsOptions = {}): Promise<StaticPathOutput[]> => {
  const baseUrl = await resolveApiBaseUrl(apiBaseUrl)
  const url = new URL(`${baseUrl.pathname.replace(/\/$/, '')}/web/staticPaths`, baseUrl)
  const response = await fetchFn(url, {
    ...(fetchOptions ?? getDefaultStaticPathsFetchOptions()),
    method: 'GET',
    headers: await createRequestHeaders({
      headers,
      forwardHeaders,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Rakun static paths request failed with ${response.status}: ${text.slice(0, 200)}`
    )
  }

  return ((await response.json()) as StaticPathsOutput).items
}

export const createRakunGenerateStaticParams = ({
  paramKey = defaultParamKey,
  basePath = '',
  ...options
}: CreateRakunGenerateStaticParamsOptions = {}) => {
  return async (): Promise<RakunNextPageParams[]> => {
    const apiBaseUrl = options.apiBaseUrl ?? defaultApiBaseUrl
    if (typeof apiBaseUrl === 'string') {
      try {
        new URL(apiBaseUrl)
      } catch {
        throw new Error(
          'createRakunGenerateStaticParams requires an absolute apiBaseUrl because Next.js does not serve local Route Handlers during next build.'
        )
      }
    }

    const paths = await getRakunStaticPaths({ ...options, apiBaseUrl })

    return paths.flatMap((item) => {
      const params = getRakunParamsFromPath({
        path: item.path,
        paramKey,
        basePath,
      })
      return params ? [params] : []
    })
  }
}

/**
 * Creates server-only web helpers for a Next.js application that owns the
 * Rakun API and database. These helpers avoid fetching the application's own
 * Route Handlers while `next build` is running.
 */
export const createRakunDatabaseWeb = ({
  bootstrap,
  paramKey = defaultParamKey,
  basePath = '',
}: CreateRakunDatabaseWebOptions) => {
  let initialization: Promise<void> | null = null

  const initialize = async () => {
    initialization ??= (async () => {
      applyRakunBootstrap(bootstrap)
      await ensureRakunInitialized()
    })()

    try {
      await initialization
    } catch (error) {
      initialization = null
      throw error
    }
  }

  const loadStaticPaths = async (): Promise<StaticPathOutput[]> => {
    await initialize()
    return (await getRakunWebStaticPaths()).items
  }
  const loadCachedStaticPaths = unstable_cache(loadStaticPaths, ['rakun:database:static-paths'], {
    revalidate: DEFAULT_STATIC_PAGE_TTL,
    tags: [RAKUN_STATIC_PATHS_CACHE_TAG],
  })
  const getStaticPaths = async (): Promise<StaticPathOutput[]> =>
    isProductionRendering() ? await loadCachedStaticPaths() : await loadStaticPaths()

  const generateStaticParams = async (): Promise<RakunNextPageParams[]> => {
    const paths = await getStaticPaths()

    return paths.flatMap((item) => {
      const params = getRakunParamsFromPath({
        path: item.path,
        paramKey,
        basePath,
      })
      return params ? [params] : []
    })
  }

  const getPage = async ({
    path,
    search,
    previewTokenParam = defaultPreviewTokenParam,
    headers,
    forwardHeaders,
    autoCache = true,
  }: GetRakunDatabasePageOptions): Promise<PageOutput> => {
    const preview = extractPreviewSearch(search, previewTokenParam)
    const normalizedPath = normalizePath(path)
    const searchValue = searchToString(preview.search)
    let staticPath: StaticPathOutput | undefined

    if (!preview.token && autoCache) {
      staticPath = (await getStaticPaths()).find(
        (item) => normalizeComparablePath(item.path) === normalizeComparablePath(normalizedPath)
      )
    }

    const staticPage =
      !!staticPath && !searchValue && !headers && forwardHeaders !== true && !preview.token
    const cachePage = staticPage && isProductionRendering()
    const requestHeaders = await createRequestHeaders({
      headers,
      forwardHeaders: forwardHeaders ?? !staticPage,
    })
    const requestHeaderEntries = Array.from(requestHeaders.entries())
    const input = {
      path: normalizedPath,
      search: searchValue,
      headers:
        requestHeaderEntries.length > 0 ? Object.fromEntries(requestHeaderEntries) : undefined,
    }

    await initialize()

    if (preview.token) {
      return markRakunPreviewPage(
        normalizeJsonOutput(
          await getRakunWebPreviewPage({
            ...input,
            token: preview.token,
          })
        ),
        { tokenParam: previewTokenParam }
      )
    }

    if (!cachePage || !staticPath) {
      return normalizeJsonOutput(await getRakunWebPage(input))
    }

    return await unstable_cache(
      async () => normalizeJsonOutput(await getRakunWebPage(input)),
      ['rakun:database:page', normalizeComparablePath(normalizedPath)],
      { revalidate: staticPath.ttl }
    )()
  }

  const getPageFromProps = async (
    { params, searchParams }: RakunNextPageProps,
    options: GetRakunDatabasePageFromPropsOptions = {}
  ): Promise<PageOutput> => {
    const path = getRakunPathFromParams({
      params: await params,
      paramKey,
      basePath,
    })
    let search: RakunNextPageSearchParams | undefined

    if (searchParams) {
      let staticPage = false

      if (options.autoCache !== false) {
        staticPage = (await getStaticPaths()).some(
          (item) => normalizeComparablePath(item.path) === normalizeComparablePath(path)
        )
      }

      if (!staticPage) {
        search = await searchParams
      }
    }

    return await getPage({
      ...options,
      path,
      search,
    })
  }

  return {
    generateStaticParams,
    getPage,
    getPageFromProps,
    getStaticPaths,
  }
}

export const getRakunPageFromProps = async (
  { params, searchParams }: RakunNextPageProps,
  {
    paramKey = defaultParamKey,
    basePath = '',
    apiBaseUrl = defaultApiBaseUrl,
    autoCache = true,
    fetchOptions,
    staticPathsFetchOptions,
    fetch: fetchFn = globalThis.fetch,
    ...options
  }: GetRakunPageFromPropsOptions = {}
): Promise<PageOutput> => {
  const path = getRakunPathFromParams({
    params: await params,
    paramKey,
    basePath,
  })
  const hasExplicitCache =
    fetchOptions?.cache !== undefined || fetchOptions?.next?.revalidate !== undefined
  let search: RakunNextPageSearchParams | undefined

  if (searchParams) {
    let staticPage = false

    if (!hasExplicitCache && autoCache && isProductionRendering()) {
      const paths = await getRakunStaticPaths({
        apiBaseUrl,
        forwardHeaders: false,
        fetchOptions: staticPathsFetchOptions,
        fetch: fetchFn,
      })
      staticPage = paths.some(
        (item) => normalizeComparablePath(item.path) === normalizeComparablePath(path)
      )
    }

    if (!staticPage) {
      search = await searchParams
    }
  }

  return getRakunPage({
    ...options,
    path,
    search,
    apiBaseUrl,
    autoCache,
    fetchOptions,
    staticPathsFetchOptions,
    fetch: fetchFn,
  })
}

export const getRakunPage = async ({
  path,
  apiBaseUrl = defaultApiBaseUrl,
  search,
  previewTokenParam = defaultPreviewTokenParam,
  headers,
  forwardHeaders,
  autoCache = true,
  staticPathsFetchOptions,
  fetchOptions,
  fetch: fetchFn = globalThis.fetch,
}: GetRakunPageOptions): Promise<PageOutput> => {
  const baseUrl = await resolveApiBaseUrl(apiBaseUrl)
  const preview = extractPreviewSearch(search, previewTokenParam)
  const operationPath = preview.token ? 'web/previewPage' : 'web/page'
  const url = new URL(`${baseUrl.pathname.replace(/\/$/, '')}/${operationPath}`, baseUrl)

  url.searchParams.set('path', normalizePath(path))
  if (preview.token) {
    url.searchParams.set('token', preview.token)
  }

  const searchValue = searchToString(preview.search)
  if (searchValue) {
    url.searchParams.set('search', searchValue)
  }

  const hasExplicitCache =
    fetchOptions?.cache !== undefined || fetchOptions?.next?.revalidate !== undefined
  let resolvedFetchOptions = fetchOptions
  let cacheStaticPage = false

  if (preview.token) {
    resolvedFetchOptions = {
      ...fetchOptions,
      cache: 'no-store',
      next: undefined,
    }
  } else if (!hasExplicitCache && autoCache && isProductionRendering()) {
    const staticPaths = await getRakunStaticPaths({
      apiBaseUrl: baseUrl,
      forwardHeaders: false,
      fetchOptions: staticPathsFetchOptions,
      fetch: fetchFn,
    })
    const staticPath = staticPaths.find(
      (item) => normalizeComparablePath(item.path) === normalizeComparablePath(path)
    )

    if (staticPath) {
      cacheStaticPage = true
      resolvedFetchOptions = {
        ...fetchOptions,
        next: {
          ...fetchOptions?.next,
          revalidate: staticPath.ttl,
        },
      }
    } else {
      resolvedFetchOptions = {
        ...fetchOptions,
        cache: 'no-store',
        next: undefined,
      }
    }
  } else if (!hasExplicitCache) {
    resolvedFetchOptions = {
      ...fetchOptions,
      cache: 'no-store',
    }
  }

  const cacheRequested =
    cacheStaticPage ||
    resolvedFetchOptions?.cache === 'force-cache' ||
    resolvedFetchOptions?.next?.revalidate !== undefined
  const response = await fetchFn(url, {
    ...resolvedFetchOptions,
    method: 'GET',
    headers: await createRequestHeaders({
      headers,
      forwardHeaders: forwardHeaders ?? !cacheRequested,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Rakun page request failed with ${response.status}: ${text.slice(0, 200)}`)
  }

  const page = (await response.json()) as PageOutput

  return preview.token ? markRakunPreviewPage(page, { tokenParam: previewTokenParam }) : page
}

const isRakunMetadataImage = (value: unknown): value is RakunMetadataImage =>
  !!value &&
  typeof value === 'object' &&
  'url' in value &&
  typeof (value as RakunMetadataImage).url === 'string'

const createMetadataImage = (
  image: unknown,
  alt?: string
):
  | {
      url: string
      width?: number
      height?: number
      alt?: string
    }
  | undefined => {
  if (!isRakunMetadataImage(image) || !image.url) {
    return undefined
  }

  return {
    url: image.url,
    width: image.width ?? undefined,
    height: image.height ?? undefined,
    alt: alt || image.alt || image.title || undefined,
  }
}

export const createRakunPageMetadata = (page: PageOutput): Metadata => {
  const seo = page.seo

  if (!seo) return {}

  const metadata: Metadata = {}
  const openGraphImage = createMetadataImage(
    seo.openGraphImage ?? seo.image,
    seo.openGraphImageAlt ?? seo.imageAlt
  )
  const twitterImage = createMetadataImage(
    seo.twitterImage ?? seo.image,
    seo.twitterImageAlt ?? seo.imageAlt
  )

  if (seo.title) metadata.title = seo.title
  if (seo.description) metadata.description = seo.description
  const alternateLanguages =
    seo.alternates && Object.keys(seo.alternates).length > 0 ? seo.alternates : undefined

  if (seo.canonicalUrl || alternateLanguages) {
    metadata.alternates = {
      canonical: seo.canonicalUrl,
      languages: alternateLanguages,
    }
  }
  if (seo.noIndex) {
    metadata.robots = {
      index: false,
    }
  }

  metadata.openGraph = {
    title: seo.openGraphTitle ?? seo.title,
    description: seo.openGraphDescription ?? seo.description,
    url: seo.openGraphUrl ?? seo.canonicalUrl,
    siteName: seo.openGraphSiteName ?? seo.siteName,
    type: seo.openGraphType ?? 'website',
    images: openGraphImage ? [openGraphImage] : undefined,
  } as NonNullable<Metadata['openGraph']>

  metadata.twitter = {
    card: seo.twitterCard ?? (twitterImage ? 'summary_large_image' : 'summary'),
    site: seo.twitterSite,
    title: seo.twitterTitle ?? seo.title,
    description: seo.twitterDescription ?? seo.description,
    images: twitterImage ? [twitterImage] : undefined,
  } as NonNullable<Metadata['twitter']>

  return metadata
}

export const getRakunSitemap = async ({
  apiBaseUrl = defaultApiBaseUrl,
  siteUrl,
  language,
  headers,
  forwardHeaders = true,
  fetchOptions,
  fetch: fetchFn = globalThis.fetch,
}: GetRakunSitemapOptions = {}): Promise<MetadataRoute.Sitemap> => {
  const [baseUrl, resolvedSiteUrl] = await Promise.all([
    resolveApiBaseUrl(apiBaseUrl),
    resolveSiteUrl(siteUrl),
  ])
  const url = new URL(`${baseUrl.pathname.replace(/\/$/, '')}/web/sitemap`, baseUrl)
  if (language) {
    url.searchParams.set('language', language)
  }

  const response = await fetchFn(url, {
    cache: 'no-store',
    ...fetchOptions,
    method: 'GET',
    headers: await createRequestHeaders({
      headers,
      forwardHeaders,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Rakun sitemap request failed with ${response.status}: ${text.slice(0, 200)}`)
  }

  const sitemap = (await response.json()) as SitemapOutput

  return sitemap.items.map((item) => ({
    url: new URL(item.path, resolvedSiteUrl).toString(),
    lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
  }))
}

export const getRakunSitemapLanguages = async ({
  apiBaseUrl = defaultApiBaseUrl,
  headers,
  forwardHeaders = true,
  fetchOptions,
  fetch: fetchFn = globalThis.fetch,
}: Omit<GetRakunSitemapOptions, 'language' | 'siteUrl'> = {}) => {
  const baseUrl = await resolveApiBaseUrl(apiBaseUrl)
  const url = new URL(`${baseUrl.pathname.replace(/\/$/, '')}/web/sitemap`, baseUrl)

  const response = await fetchFn(url, {
    cache: 'no-store',
    ...fetchOptions,
    method: 'GET',
    headers: await createRequestHeaders({
      headers,
      forwardHeaders,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Rakun sitemap languages request failed with ${response.status}: ${text.slice(0, 200)}`
    )
  }

  return ((await response.json()) as SitemapOutput).languages
}

export const createRakunSitemapHandler =
  (options: GetRakunSitemapOptions = {}) =>
  async (): Promise<MetadataRoute.Sitemap> =>
    await getRakunSitemap(options)

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const createXmlResponse = (xml: string): Response =>
  new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })

const renderSitemapIndexXml = (
  entries: Array<{ url: string; lastModified?: string | Date }>
): string => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <sitemap>
    <loc>${escapeXml(entry.url)}</loc>${
      entry.lastModified
        ? `
    <lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>`
        : ''
    }
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`

const renderSitemapXml = (
  entries: MetadataRoute.Sitemap
): string => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>${
      entry.lastModified
        ? `
    <lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>`
        : ''
    }
  </url>`
  )
  .join('\n')}
</urlset>`

const getStringParam = (
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined => {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

export const createRakunSitemapIndexRouteHandler =
  ({
    siteUrl,
    sitemapPath = (language) => `/${language}/sitemap.xml`,
    ...options
  }: CreateRakunSitemapIndexRouteHandlerOptions = {}) =>
  async (): Promise<Response> => {
    const [languages, resolvedSiteUrl] = await Promise.all([
      getRakunSitemapLanguages(options),
      resolveSiteUrl(siteUrl),
    ])

    return createXmlResponse(
      renderSitemapIndexXml(
        languages.map((language) => ({
          url: new URL(sitemapPath(language.code), resolvedSiteUrl).toString(),
        }))
      )
    )
  }

export const createRakunLocaleSitemapRouteHandler =
  ({ paramKey = 'language', ...options }: CreateRakunLocaleSitemapRouteHandlerOptions = {}) =>
  async (_request: Request, context: RakunSitemapRouteHandlerContext): Promise<Response> => {
    const params = await context.params
    const language = getStringParam(params, paramKey)
    const entries = await getRakunSitemap({
      ...options,
      language,
    })

    return createXmlResponse(renderSitemapXml(entries))
  }

export const getRakunRobotsTxt = async ({
  apiBaseUrl = defaultApiBaseUrl,
  headers,
  forwardHeaders = true,
  fetchOptions,
  fetch: fetchFn = globalThis.fetch,
}: GetRakunRobotsTxtOptions = {}): Promise<string> => {
  const baseUrl = await resolveApiBaseUrl(apiBaseUrl)
  const url = new URL(`${baseUrl.pathname.replace(/\/$/, '')}/web/robots`, baseUrl)

  const response = await fetchFn(url, {
    cache: 'no-store',
    ...fetchOptions,
    method: 'GET',
    headers: await createRequestHeaders({
      headers,
      forwardHeaders,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Rakun robots.txt request failed with ${response.status}: ${text.slice(0, 200)}`
    )
  }

  return ((await response.json()) as RobotsOutput).content
}

export const createRakunRobotsTxtRouteHandler =
  (options: GetRakunRobotsTxtOptions = {}) =>
  async (): Promise<Response> =>
    new Response(await getRakunRobotsTxt(options), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })

export const getRakunLlmsTxt = async ({
  apiBaseUrl = defaultApiBaseUrl,
  language,
  headers,
  forwardHeaders = true,
  fetchOptions,
  fetch: fetchFn = globalThis.fetch,
}: GetRakunLlmsTxtOptions = {}): Promise<string | null> => {
  const baseUrl = await resolveApiBaseUrl(apiBaseUrl)
  const url = new URL(`${baseUrl.pathname.replace(/\/$/, '')}/web/llms`, baseUrl)
  if (language) {
    url.searchParams.set('language', language)
  }

  const response = await fetchFn(url, {
    cache: 'no-store',
    ...fetchOptions,
    method: 'GET',
    headers: await createRequestHeaders({
      headers,
      forwardHeaders,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Rakun llms.txt request failed with ${response.status}: ${text.slice(0, 200)}`
    )
  }

  return ((await response.json()) as LlmsOutput)?.content ?? null
}

const createLlmsTxtResponse = (content: string | null): Response =>
  content === null
    ? new Response(null, { status: 404 })
    : new Response(content, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      })

export const createRakunLlmsTxtRouteHandler =
  (options: GetRakunLlmsTxtOptions = {}) =>
  async (): Promise<Response> =>
    createLlmsTxtResponse(await getRakunLlmsTxt(options))

export const createRakunLocaleLlmsTxtRouteHandler =
  ({
    paramKey = 'language',
    ...options
  }: CreateRakunLocaleLlmsTxtRouteHandlerOptions = {}) =>
  async (_request: Request, context: RakunSitemapRouteHandlerContext): Promise<Response> => {
    const params = await context.params
    const language = getStringParam(params, paramKey)

    return createLlmsTxtResponse(
      await getRakunLlmsTxt({
        ...options,
        language,
      })
    )
  }
