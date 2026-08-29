import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { afterEach, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToReadableStream } from 'react-dom/server.browser'
import type { Root } from 'postcss'

import { RakunPathnameProvider, usePathname } from './browser'
import { buildRakunServerBundle } from './build'
import { formatRakunBuildReport } from './report'
import { createRakunBun } from './server'

const directories: string[] = []

afterEach(async () => {
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

test('builds server/client graphs and a static route', async () => {
  const root = await mkdtemp(resolve(import.meta.dir, '..', '.tmp-rakun-bun-'))
  directories.push(root)
  const modulesDir = resolve(root, 'src', 'modules')
  const publicDir = resolve(root, 'public')
  await Promise.all([mkdir(modulesDir, { recursive: true }), mkdir(publicDir, { recursive: true })])
  await Promise.all([
    writeFile(resolve(root, 'src', 'document.css'), 'body { color: rgb(12, 34, 56); }'),
    writeFile(resolve(publicDir, 'robots.txt'), 'User-agent: *\nDisallow:'),
    writeFile(
      resolve(root, 'src', 'document.tsx'),
      `import './document.css'\nexport default function Document({ children }) { return <html lang="es"><head><meta name="shell" content="document" /></head><body><header>Document shell</header>{children}</body></html> }`
    ),
    writeFile(
      resolve(modulesDir, 'Hero.tsx'),
      `export default function Hero({ title }) { return <h1>{title}</h1> }`
    ),
    writeFile(
      resolve(modulesDir, 'Counter.tsx'),
      `'use client'\nimport { Link, usePathname } from '@rakun-kit/bun'\nimport { useId, useState } from 'react'\nexport default function Counter({ initial }) { const [value] = useState(initial); const id = useId(); const pathname = usePathname(); return <Link href="/counter"><span id={id}>{pathname}:{value}</span></Link> }`
    ),
  ])

  let heading = 'Page'
  const application = createRakunBun(
    {
      css: {
        plugins: [
          {
            postcssPlugin: 'rakun-test-css-plugin',
            Once(root: Root) {
              root.append({
                nodes: [{ prop: '--rakun-test-css', value: 'enabled' }],
                selector: ':root',
              })
            },
          },
        ],
      },
      revalidation: { token: 'test-token' },
      rootDir: root,
      server: { development: false, hostname: '127.0.0.1', port: 0 },
      web: {
        getStaticPaths: () => ({ items: [{ path: '/', ttl: 60 }] }),
        getPage: ({ path, search }) =>
          search?.includes('rakun_preview=')
            ? {
                renderMode: 'dynamic',
                layout: [
                  {
                    type: 'content',
                    modules: [{ _id: 'preview', _type: 'Hero', title: 'Preview value' }],
                  },
                ],
              }
            : path === '/missing'
              ? {
                  renderMode: 'dynamic',
                  layout: [
                    {
                      type: 'content',
                      modules: [{ _id: 'not-found', _type: 'NotFound' }],
                    },
                  ],
                }
              : {
                  renderMode: 'static',
                  seo: { title: `Title ${path}` },
                  layout: [
                    {
                      type: 'content',
                      modules: [
                        { _id: 'hero', _type: 'Hero', title: `${heading} ${path}` },
                        { _id: 'counter', _type: 'Counter', initial: 2 },
                      ],
                    },
                  ],
                },
      },
    },
    { cwd: root }
  )

  const result = await application.build({ clean: true })
  expect(result.staticPaths).toEqual(['/'])
  expect(result.routes[0]?.assets.clientModules).toEqual(['Counter'])
  expect(result.manifest.client.Counter?.chunk).toMatch(/^\/assets\/module-0000\.generated-/)
  expect(result.manifest.client.Hero).toBeUndefined()
  expect(result.manifest.managerAssets.some((asset) => asset.endsWith('.js'))).toBe(true)
  expect(result.manifest.managerAssets.some((asset) => asset.endsWith('.css'))).toBe(true)
  expect(result.manifest.managerAssets.every((asset) => asset.startsWith('/assets/manager/'))).toBe(
    true
  )
  expect(result.manifest.assets.some((asset) => asset.endsWith('.css'))).toBe(true)
  expect(await readFile(resolve(root, 'dist', 'public', 'robots.txt'), 'utf8')).toBe(
    'User-agent: *\nDisallow:'
  )
  const stylesheet = result.manifest.assets.find((asset) => asset.endsWith('.css'))
  expect(stylesheet).toBeDefined()
  expect(await readFile(resolve(root, 'dist', stylesheet!.slice(1)), 'utf8')).toContain(
    '--rakun-test-css: enabled'
  )
  const builtAssets = await readdir(resolve(root, 'dist', 'assets'))
  expect(builtAssets.some((asset) => asset.startsWith('chunk-'))).toBe(false)
  const managerBuiltAssets = await readdir(resolve(root, 'dist', 'assets', 'manager'), {
    recursive: true,
  })
  const managerScripts = managerBuiltAssets.filter((asset) => asset.endsWith('.js'))
  expect(managerScripts.length).toBeGreaterThan(1)
  expect(managerScripts.length).toBeLessThan(100)
  expect(managerScripts.some((asset) => asset.startsWith('chunk-'))).toBe(true)
  const counterScript = result.manifest.client.Counter?.chunk
  expect(counterScript).toBeDefined()
  expect(
    await readFile(resolve(root, 'dist', result.manifest.navigation.slice(1)), 'utf8')
  ).not.toContain('Open Rakun development toolbar')
  expect(await readFile(resolve(root, 'dist', counterScript!.slice(1)), 'utf8')).not.toContain(
    '/assets/chunk-'
  )
  const rawCounter = await readFile(resolve(root, 'dist', counterScript!.slice(1)))
  const compressedCounterResponse = await application.fetch(
    new Request(`http://localhost${counterScript}`, {
      headers: { 'Accept-Encoding': 'gzip' },
    })
  )
  expect(compressedCounterResponse.headers.get('content-encoding')).toBe('gzip')
  expect(compressedCounterResponse.headers.get('vary')).toBe('Accept-Encoding')
  const compressedCounter = new Uint8Array(await compressedCounterResponse.arrayBuffer())
  expect(compressedCounter.byteLength).toBeLessThan(rawCounter.byteLength)
  expect(Bun.gunzipSync(compressedCounter)).toEqual(new Uint8Array(rawCounter))
  const uncompressedCounterResponse = await application.fetch(
    new Request(`http://localhost${counterScript}`, {
      headers: { 'Accept-Encoding': 'gzip;q=0, *;q=1' },
    })
  )
  expect(uncompressedCounterResponse.headers.get('content-encoding')).toBeNull()
  expect(new Uint8Array(await uncompressedCounterResponse.arrayBuffer())).toEqual(
    new Uint8Array(rawCounter)
  )
  const managerScript = result.manifest.managerAssets.find((asset) => asset.endsWith('.js'))
  expect(managerScript).toBeDefined()
  const managerEntrySource = await readFile(resolve(root, 'dist', managerScript!.slice(1)), 'utf8')
  expect(managerEntrySource).toContain('import("/assets/manager/')
  expect(managerEntrySource).not.toMatch(/(?:from|import)\s*["']\/assets\/manager\/[^"']+\.js["']/)
  const managerSources = await Promise.all(
    managerScripts.map(
      async (asset) => await readFile(resolve(root, 'dist', 'assets', 'manager', asset), 'utf8')
    )
  )
  const managerSource = managerSources.join('\n')
  expect(managerSource).toContain('/manager/contentTypes')
  expect(managerSource).toContain('realtimeBaseUrl')
  for (const source of managerSources) {
    for (const match of source.matchAll(/["']\/assets\/manager\/([^"']+\.js)["']/g)) {
      expect(Bun.file(resolve(root, 'dist', 'assets', 'manager', match[1]!)).size).toBeGreaterThan(
        0
      )
    }
  }

  const response = await application.fetch(new Request('http://localhost/'))
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate')
  const responseHtml = await response.text()
  expect(responseHtml).toContain('<h1>Page /</h1>')
  expect(responseHtml).toContain('<a href="/counter"><span')
  expect(responseHtml).toMatch(/>\/<!-- -->:<!-- -->2<\/span>/)
  expect(responseHtml).toContain('data-rakun-pathname="/"')
  expect(responseHtml).toContain('<html lang="es">')
  expect(responseHtml).toContain('<header>Document shell</header><div id="rakun-root">')
  expect(responseHtml).toContain('<meta name="shell" content="document"/>')
  expect(responseHtml).toContain('<title data-rakun-head="">Title /</title>')
  expect(responseHtml).toContain('<link rel="stylesheet" href="/assets/')
  expect(responseHtml).not.toContain('/assets/manager/')
  expect(responseHtml).toMatch(/data-rakun-identifier-prefix="rakun-[^"]+"/)
  expect(responseHtml).toMatch(/id="_rakun-[^"]+"/)
  expect(responseHtml).toContain('"reloadBasePaths":["/api"')
  expect(responseHtml).not.toContain('data-rakun-devtools')
  expect(responseHtml).not.toContain('rakun-module-start:')
  expect(responseHtml.indexOf('<meta charset="utf-8"')).toBeLessThan(
    responseHtml.indexOf('<meta name="shell"')
  )

  const dynamicPathHtml = await (
    await application.fetch(new Request('http://localhost/current-path'))
  ).text()
  expect(dynamicPathHtml).toContain('data-rakun-pathname="/current-path"')

  const publicFile = await application.fetch(new Request('http://localhost/robots.txt'))
  expect(publicFile.status).toBe(200)
  expect(publicFile.headers.get('cache-control')).toBe('public, max-age=0')
  expect(await publicFile.text()).toBe('User-agent: *\nDisallow:')

  const previewResponse = await application.fetch(
    new Request('http://localhost/?rakun_preview=test-token')
  )
  expect(previewResponse.headers.get('cache-control')).toBe('no-store')
  expect(await previewResponse.text()).toContain('<h1>Preview value</h1>')

  const notFoundResponse = await application.fetch(new Request('http://localhost/missing'))
  expect(notFoundResponse.status).toBe(404)
  expect(await notFoundResponse.text()).toContain('data-rakun-not-found=""')

  const server = await application.serve()
  try {
    const served = await fetch(server.url)
    expect(served.status).toBe(200)
    expect(await served.text()).toContain('<h1>Page /</h1>')
    const flight = await fetch(new URL('/_rakun/rsc/', server.url))
    expect(flight.headers.get('content-type')).toContain('text/x-component')
    expect(flight.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate')
    const manager = await fetch(new URL('/manager', server.url))
    expect(await manager.text()).toContain('rakun-manager-root')

    heading = 'Updated'
    const revalidated = await fetch(new URL('/_rakun/revalidate', server.url), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: '/' }),
    })
    expect(revalidated.status).toBe(200)
    expect(await (await fetch(server.url)).text()).toContain('<h1>Updated /</h1>')
  } finally {
    application.stop()
  }

  const routesManifest = await readFile(join(root, 'dist', 'manifests', 'routes.json'), 'utf8')
  expect(JSON.parse(routesManifest)).toEqual({ items: [{ path: '/' }] })

  const configPath = resolve(root, 'rakun.config.ts')
  await writeFile(
    configPath,
    `export default {
      manager: false,
      rootDir: ${JSON.stringify(root)},
      server: { hostname: '127.0.0.1', port: 0 },
      web: {
        getStaticPaths: () => ({ items: [{ path: '/', ttl: 60 }] }),
        getPage: ({ path }) => ({
          renderMode: path === '/' ? 'static' : 'dynamic',
          layout: [{ type: 'content', modules: [{ _id: 'hero', _type: 'Hero', title: 'Production ' + path }] }],
        }),
      },
    }`
  )
  const productionServer = await buildRakunServerBundle({
    config: application.config,
    configPath,
    generatedRegistry: resolve(root, '.rakun', 'generated', 'modules.generated.ts'),
  })
  const buildReport = await formatRakunBuildReport({
    config: application.config,
    result,
    serverPath: productionServer,
  })
  expect(buildReport).toContain('Routes (1 static)')
  expect(buildReport).toContain('navigation, Counter')
  expect(buildReport).toContain('Gzip')
  expect(buildReport).toContain('Manager initial')
  expect(buildReport).toContain('Manager routes')
  expect(buildReport).toContain('Manager output')
  expect(buildReport).toContain('Total output')
  const collapsedReport = await formatRakunBuildReport({
    config: application.config,
    result: {
      ...result,
      routes: Array.from({ length: 25 }, (_, index) => ({
        ...result.routes[0]!,
        path: `/route-${index}`,
      })),
      staticPaths: Array.from({ length: 25 }, (_, index) => `/route-${index}`),
    },
    serverPath: productionServer,
  })
  expect(collapsedReport).toContain('5 routes omitted')
  const production = (await import(`${productionServer}?t=${Date.now()}`)) as {
    app: typeof application
  }
  try {
    expect(production.app.config.server.development).toBe(false)
    const productionAssetResponse = await production.app.fetch(
      new Request(`http://localhost${counterScript}`, {
        headers: { 'Accept-Encoding': 'gzip' },
      })
    )
    expect(productionAssetResponse.headers.get('content-encoding')).toBe('gzip')
    const productionResponse = await production.app.fetch(new Request('http://localhost/dynamic'))
    const productionHtml = await productionResponse.text()
    expect(productionHtml).toContain('<header>Document shell</header>')
    expect(productionHtml).toContain('<h1>Production /dynamic</h1>')
  } finally {
    production.app.stop()
  }

  await writeFile(
    resolve(root, 'src', 'document.tsx'),
    `export const Document = ({ children }) => <html><head /><body>{children}</body></html>`
  )
  await expect(application.build()).rejects.toThrow(
    'Rakun src/document.tsx must export a default component.'
  )
}, 15_000)

test('renders usePathname from the server pathname snapshot', async () => {
  const Pathname = () => createElement('span', undefined, usePathname())
  const stream = await renderToReadableStream(
    createElement(
      RakunPathnameProvider,
      { pathname: '/current-path' },
      createElement(Pathname)
    )
  )
  await stream.allReady
  expect(await new Response(stream).text()).toBe('<span>/current-path</span>')
})

test('reports browser bundle diagnostics when Bun rejects a build', async () => {
  const root = await mkdtemp(resolve(import.meta.dir, '..', '.tmp-rakun-bun-'))
  directories.push(root)
  const modulesDir = resolve(root, 'src', 'modules')
  await mkdir(modulesDir, { recursive: true })
  await writeFile(
    resolve(modulesDir, 'Broken.tsx'),
    `'use client'\nimport { AsyncLocalStorage } from 'async_hooks'\nexport default function Broken() { return <span>{String(AsyncLocalStorage)}</span> }`
  )

  const application = createRakunBun(
    {
      manager: false,
      rootDir: root,
      server: { development: true, hostname: '127.0.0.1', port: 0 },
    },
    { cwd: root }
  )

  await expect(application.build()).rejects.toThrow(
    /Rakun client module build failed:\nBrowser build cannot import Node\.js builtin: "async_hooks"[\s\S]+Broken\.tsx:2:/
  )
})
