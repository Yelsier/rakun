import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { afterEach, expect, test } from 'bun:test'

import { createRakunBun } from './server'

const directories: string[] = []

afterEach(async () => {
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

test('treats development routes as dynamic without loading or populating the route cache', async () => {
  const root = await mkdtemp(resolve(import.meta.dir, '..', '.tmp-rakun-development-'))
  directories.push(root)
  const modulesDir = resolve(root, 'src', 'modules')
  await mkdir(modulesDir, { recursive: true })
  await writeFile(
    resolve(modulesDir, 'Page.tsx'),
    `export default function Page({ request }) { return <p>{request}</p> }`
  )
  let pageRequests = 0
  let staticPathRequests = 0
  const application = createRakunBun({
    manager: false,
    rootDir: root,
    server: { development: true },
    web: {
      getPage: () => ({
        layout: [
          {
            modules: [{ _id: 'page', _type: 'Page', request: ++pageRequests }],
            type: 'content',
          },
        ],
        renderMode: 'static',
      }),
      getStaticPaths: () => {
        staticPathRequests += 1
        return { items: [{ path: '/', ttl: 60 }] }
      },
    },
  })

  const first = await application.fetch(new Request('http://localhost/'))
  const second = await application.fetch(new Request('http://localhost/'))
  await application.invalidatePath('/')
  const third = await application.fetch(new Request('http://localhost/'))

  expect(first.headers.get('cache-control')).toBe('no-store')
  expect(await first.text()).toContain('<p>1</p>')
  expect(await second.text()).toContain('<p>2</p>')
  expect(await third.text()).toContain('<p>3</p>')
  expect(staticPathRequests).toBe(0)
}, 10_000)
