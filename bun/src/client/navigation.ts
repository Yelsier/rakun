type PageAssets = {
  clientModules: string[]
  scripts: string[]
  styles: string[]
}

export {}

type FlightPayload = {
  assets: PageAssets
  head: string
  html: string
  path: string
  redirect?: { status: number; to: string }
}

type RakunBrowserConfig = {
  dev?: boolean
  reloadBasePaths: string[]
  rscPath: string
}

declare global {
  interface Window {
    __RAKUN_BUN__?: RakunBrowserConfig
  }
}

const loadedStyles = new Set(
  Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(
    (link) => new URL(link.href, location.href).pathname
  )
)
const loadedScripts = new Map<string, Promise<Record<string, unknown>>>()
const prefetchedFlights = new Map<string, Promise<FlightPayload | undefined>>()

const isWithinBasePath = (pathname: string, basePath: string): boolean =>
  pathname === basePath || pathname.startsWith(`${basePath}/`)

const loadStyles = (assets: PageAssets): void => {
  for (const href of assets.styles) {
    if (loadedStyles.has(href)) continue
    loadedStyles.add(href)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.append(link)
  }
}

const importClientModules = async (assets: PageAssets): Promise<Record<string, unknown>[]> => {
  loadStyles(assets)
  return Promise.all(
    assets.scripts.map((src) => {
      let loaded = loadedScripts.get(src)
      if (!loaded) {
        loaded = import(src) as Promise<Record<string, unknown>>
        loadedScripts.set(src, loaded)
      }
      return loaded
    })
  )
}

const loadClientModules = async (assets: PageAssets): Promise<void> => {
  const modules = await importClientModules(assets)
  for (const loaded of modules) {
    if (typeof loaded.hydrate === 'function') {
      ;(loaded.hydrate as () => void)()
    }
  }
}

const getFlight = async (url: URL): Promise<FlightPayload | undefined> => {
  const key = `${url.pathname}${url.search}`
  const prefetched = prefetchedFlights.get(key)
  if (prefetched) return prefetched

  const config = window.__RAKUN_BUN__
  if (!config) return undefined

  const request = fetch(`${config.rscPath}${url.pathname}${url.search}`, {
    headers: { Accept: 'text/x-component' },
  })
    .then(async (response) => {
      if (!response.ok) {
        prefetchedFlights.delete(key)
        return undefined
      }
      return (await response.json()) as FlightPayload
    })
    .catch((error) => {
      prefetchedFlights.delete(key)
      throw error
    })

  prefetchedFlights.set(key, request)
  return request
}

const getInternalAnchorUrl = (anchor: HTMLAnchorElement): URL | undefined => {
  const config = window.__RAKUN_BUN__
  if (
    !config ||
    anchor.target ||
    anchor.download ||
    anchor.dataset.rakunReload !== undefined
  ) {
    return undefined
  }

  const url = new URL(anchor.href, location.href)
  if (
    url.origin !== location.origin ||
    (url.pathname === location.pathname && url.search === location.search) ||
    config.reloadBasePaths.some((basePath) => isWithinBasePath(url.pathname, basePath))
  ) {
    return undefined
  }

  return url
}

const isPrefetchableAnchor = (anchor: HTMLAnchorElement): URL | undefined => {
  if (anchor.dataset.rakunPrefetch === 'false') return undefined
  return getInternalAnchorUrl(anchor)
}

const prefetch = (url: URL): void => {
  void getFlight(url)
    .then((payload) => (payload ? importClientModules(payload.assets) : undefined))
    .catch(() => undefined)
}

const applyHead = (html: string): void => {
  for (const element of document.head.querySelectorAll('[data-rakun-head]')) {
    element.remove()
  }

  const template = document.createElement('template')
  template.innerHTML = html
  for (const element of Array.from(template.content.children)) {
    element.setAttribute('data-rakun-head', '')
    document.head.append(element)
  }
}

const navigate = async (url: URL, replace = false): Promise<void> => {
  const config = window.__RAKUN_BUN__
  const root = document.querySelector<HTMLElement>('#rakun-root')
  if (!config || !root) {
    location.assign(url)
    return
  }
  if (config.reloadBasePaths.some((basePath) => isWithinBasePath(url.pathname, basePath))) {
    location.assign(url)
    return
  }

  const payload = await getFlight(url)
  if (!payload) {
    location.assign(url)
    return
  }

  if (payload.redirect) {
    location.assign(payload.redirect.to)
    return
  }

  root.innerHTML = payload.html
  applyHead(payload.head)
  await loadClientModules(payload.assets)
  history[replace ? 'replaceState' : 'pushState']({}, '', url)
  scrollTo({ top: 0 })
}

document.addEventListener('click', (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }

  const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]')
  const url = anchor ? getInternalAnchorUrl(anchor) : undefined
  if (!url) return

  event.preventDefault()
  void navigate(url).catch(() => location.assign(url))
})

const prefetchFromEvent = (event: Event): void => {
  const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]')
  const url = anchor ? isPrefetchableAnchor(anchor) : undefined
  if (url) prefetch(url)
}

document.addEventListener('pointerover', (event) => {
  const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]')
  if (
    !anchor ||
    (event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget))
  ) {
    return
  }
  prefetchFromEvent(event)
})
document.addEventListener('focusin', prefetchFromEvent)
document.addEventListener('touchstart', prefetchFromEvent, { passive: true })

addEventListener('popstate', () => {
  void navigate(new URL(location.href), true).catch(() => location.reload())
})

const initialAssets = document.querySelector<HTMLScriptElement>('script[data-rakun-assets]')
if (initialAssets?.textContent) {
  void loadClientModules(JSON.parse(initialAssets.textContent) as PageAssets)
}

if (window.__RAKUN_BUN__?.dev) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const socket = new WebSocket(`${protocol}//${location.host}/_rakun/dev`)
  socket.addEventListener('message', (event) => {
    if (event.data === 'update') {
      prefetchedFlights.clear()
      void navigate(new URL(location.href), true).catch(() => location.reload())
    }
  })
}
