import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { afterEach, expect, test } from 'bun:test'

import { buildRakunServerBundle } from './build'
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
  await mkdir(modulesDir, { recursive: true })
  await Promise.all([
    writeFile(resolve(root, 'src', 'document.css'), 'body { color: rgb(12, 34, 56); }'),
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
      `'use client'\nimport { useState } from 'react'\nexport default function Counter({ initial }) { const [value] = useState(initial); return <span>{value}</span> }`
    ),
  ])

  let heading = 'Page'
  const application = createRakunBun(
    {
      revalidation: { token: 'test-token' },
      rootDir: root,
      server: { development: false, hostname: '127.0.0.1', port: 0 },
      web: {
        getStaticPaths: () => ({ items: [{ path: '/', ttl: 60 }] }),
        getPage: ({ path }) =>
          path === '/missing'
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
  expect(result.manifest.client.Counter?.chunk).toMatch(/^\/assets\/module-0000\.generated-/)
  expect(result.manifest.client.Hero).toBeUndefined()
  expect(result.manifest.managerAssets.some((asset) => asset.endsWith('.js'))).toBe(true)
  expect(result.manifest.managerAssets.some((asset) => asset.endsWith('.css'))).toBe(true)
  expect(result.manifest.assets.some((asset) => asset.endsWith('.css'))).toBe(true)
  const managerScript = result.manifest.managerAssets.find((asset) => asset.endsWith('.js'))
  expect(managerScript).toBeDefined()
  expect(await readFile(resolve(root, 'dist', managerScript!.slice(1)), 'utf8')).toContain(
    '/manager/contentTypes'
  )
  expect(await readFile(resolve(root, 'dist', managerScript!.slice(1)), 'utf8')).toContain(
    'realtimeBaseUrl'
  )

  const response = await application.fetch(new Request('http://localhost/'))
  expect(response.status).toBe(200)
  const responseHtml = await response.text()
  expect(responseHtml).toContain('<h1>Page /</h1>')
  expect(responseHtml).toContain('<html lang="es">')
  expect(responseHtml).toContain('<header>Document shell</header><div id="rakun-root">')
  expect(responseHtml).toContain('<meta name="shell" content="document"/>')
  expect(responseHtml).toContain('<title data-rakun-head="">Title /</title>')
  expect(responseHtml).toContain('<link rel="stylesheet" href="/assets/')
  expect(responseHtml).toContain('"reloadBasePaths":["/api"')
  expect(responseHtml.indexOf('<meta charset="utf-8"')).toBeLessThan(
    responseHtml.indexOf('<meta name="shell"')
  )

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
      server: { development: false, hostname: '127.0.0.1', port: 0 },
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
  const production = (await import(`${productionServer}?t=${Date.now()}`)) as {
    app: typeof application
  }
  try {
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
