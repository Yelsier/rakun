import type { PageInput, PageOutput } from '@rakun-kit/core/contracts'
import { defineRakunConfig } from '@rakun-kit/bun'

const copy = {
  title: 'Rakun on Bun',
  description: 'One Bun process, server-rendered modules, and small client islands.',
  homeLink: 'Static home',
  dynamicLink: 'Dynamic example',
  staticBadge: 'Static route',
  dynamicBadge: 'Dynamic route',
  counterLabel: 'Interactive island',
  routesLabel: 'Preview routes',
} as const

const getPage = ({ path }: PageInput): PageOutput => {
  const isStatic = path === '/'

  return {
    renderMode: isStatic ? 'static' : 'dynamic',
    ...(isStatic ? { ttl: 60 } : {}),
    seo: {
      _id: `seo:${path}`,
      _type: 'Seo',
      title: isStatic ? copy.title : `${copy.title} · ${path}`,
      description: copy.description,
    },
    literals: copy,
    info: { path },
    layout: [
      {
        type: 'content',
        modules: [
          {
            _id: `preview:${path}`,
            _type: 'PreviewPage',
            badge: isStatic ? copy.staticBadge : copy.dynamicBadge,
            description: copy.description,
            dynamicLink: copy.dynamicLink,
            homeLink: copy.homeLink,
            path,
            routesLabel: copy.routesLabel,
            title: copy.title,
          },
          {
            _id: `counter:${path}`,
            _type: 'Counter',
            initial: isStatic ? 1 : 0,
            label: copy.counterLabel,
          },
        ],
      },
    ],
  }
}

export default defineRakunConfig({
  manager: false,
  modulesDir: './src/modules',
  revalidation: {
    token: process.env.RAKUN_REVALIDATE_TOKEN ?? 'preview-bun-token',
  },
  server: {
    port: Number(process.env.PORT ?? 4200),
  },
  web: {
    getPage,
    getStaticPaths: () => ({
      items: [{ path: '/', ttl: 60 }],
    }),
  },
  document: ({ body }) => ({
    body,
    htmlAttributes: { lang: 'en' },
  }),
})
