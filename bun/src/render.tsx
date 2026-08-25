import { Buffer } from 'node:buffer'

import { Fragment, createElement, isValidElement, type ComponentType, type ReactNode } from 'react'
import { renderToReadableStream } from 'react-dom/server.browser'
import type { PageModule, PageOutput } from '@rakun-kit/core/contracts'
import { getPageLayout } from '@rakun-kit/core/web'
import { PageInfoProvider, getRakunBuiltinModuleComponent, runWithPageInfo } from '@rakun-kit/react'

import type {
  RakunBuildManifest,
  RakunBunConfig,
  RakunBunDocument,
  RakunBunPageAssets,
  RakunServerModuleRegistry,
  RenderedRoute,
} from './types'

const SCRIPT_ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}

const serializeScriptValue = (value: unknown): string =>
  JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (character) => SCRIPT_ESCAPES[character] ?? character
  )

const renderNode = async (node: ReactNode): Promise<string> => {
  const stream = await renderToReadableStream(node)
  await stream.allReady
  return await new Response(stream).text()
}

const markHeadElements = (html: string): string =>
  html.replace(/<(title|meta|link|style|base)(?=[\s>])/g, '<$1 data-rakun-head=""')

const resolveComponent = (
  module: PageModule,
  registry: RakunServerModuleRegistry
): { client: boolean; Component: ComponentType<PageModule> } => {
  const BuiltinComponent = getRakunBuiltinModuleComponent(module._type)
  if (BuiltinComponent) {
    return {
      client: false,
      Component: BuiltinComponent as ComponentType<PageModule>,
    }
  }

  const entry = registry[module._type]
  if (!entry) {
    throw new Error(`Rakun web module "${module._type}" is not registered.`)
  }

  const Component = entry.module.default ?? entry.module.component
  if (!Component) {
    throw new Error(
      `Rakun web module "${module._type}" must export a default component or named component.`
    )
  }

  return { client: entry.client, Component }
}

const encodeProps = (props: PageModule): string =>
  Buffer.from(JSON.stringify(props)).toString('base64url')

const renderPageBody = async (
  page: PageOutput,
  registry: RakunServerModuleRegistry
): Promise<ReactNode> => {
  const rendered: ReactNode[] = []

  const renderModule = (module: PageModule, key: string): ReactNode => {
    const { client, Component } = resolveComponent(module, registry)
    const component = createElement(Component, { ...module, key })

    if (!client) return component

    return (
      <div data-rakun-client={module._type} data-rakun-props={encodeProps(module)} key={key}>
        <PageInfoProvider value={page.info} literals={page.literals}>
          {component}
        </PageInfoProvider>
      </div>
    )
  }

  for (const [layoutIndex, item] of getPageLayout(page).entries()) {
    if (item.type === 'module') {
      if (item.module) {
        rendered.push(
          renderModule(item.module, `layout:${item.key}:${item.module._id}:${layoutIndex}`)
        )
      }
      continue
    }

    rendered.push(
      <main key={`content:${layoutIndex}`}>
        {item.modules.map((module, moduleIndex) =>
          renderModule(module, `content:${module._id}:${layoutIndex}:${moduleIndex}`)
        )}
      </main>
    )
  }

  return (
    <PageInfoProvider value={page.info} literals={page.literals}>
      {rendered}
    </PageInfoProvider>
  )
}

const getSeoHead = (page: PageOutput): ReactNode => {
  const seo = page.seo
  const title = typeof seo?.title === 'string' ? seo.title : undefined
  const description = typeof seo?.description === 'string' ? seo.description : undefined

  return (
    <>
      {title ? <title>{title}</title> : null}
      {description ? <meta name="description" content={description} /> : null}
      {seo?.noIndex === true ? <meta name="robots" content="noindex, nofollow" /> : null}
    </>
  )
}

const toAttributes = (attributes: Record<string, string> | undefined): string =>
  Object.entries(attributes ?? {})
    .map(
      ([name, value]) =>
        ` ${name.replace(/[^a-zA-Z0-9:_-]/g, '')}="${value
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')}"`
    )
    .join('')

const isDocumentResult = (value: unknown): value is RakunBunDocument =>
  Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !isValidElement(value) &&
    ('body' in value || 'head' in value || 'htmlAttributes' in value || 'bodyAttributes' in value)
  )

const collectPageAssets = (page: PageOutput, manifest: RakunBuildManifest): RakunBunPageAssets => {
  const types = new Set<string>()
  for (const item of page.layout) {
    if (item.type === 'module') {
      if (item.module) types.add(item.module._type)
    } else {
      for (const module of item.modules) types.add(module._type)
    }
  }
  const clientModules = Array.from(types).filter((type) => manifest.client[type])

  return {
    clientModules,
    scripts: clientModules.map((type) => manifest.client[type].chunk),
    styles: Array.from(
      new Set([
        ...manifest.assets.filter((asset) => asset.endsWith('.css')),
        ...clientModules.flatMap((type) => manifest.client[type].styles ?? []),
      ])
    ),
  }
}

export const renderRakunRoute = async ({
  config,
  manifest,
  page,
  path,
  registry,
}: {
  config: Pick<RakunBunConfig, 'document'> & { server: { development: boolean } }
  manifest: RakunBuildManifest
  page: PageOutput
  path: string
  registry: RakunServerModuleRegistry
}): Promise<RenderedRoute> => {
  const assets = collectPageAssets(page, manifest)

  if (page.redirect) {
    return {
      path,
      html: '',
      flight: {
        assets,
        head: '',
        html: '',
        path,
        redirect: page.redirect,
      },
    }
  }

  return await runWithPageInfo(
    page.info,
    async () => {
      const defaultBody = await renderPageBody(page, registry)
      const custom = config.document
        ? await config.document({ assets, body: defaultBody, page, path })
        : undefined
      const document = isDocumentResult(custom)
        ? custom
        : custom === undefined
          ? {}
          : { body: custom }
      const body = document.body ?? defaultBody
      const defaultHead = getSeoHead(page)
      const head = markHeadElements(
        await renderNode(
          <Fragment>
            {defaultHead}
            {document.head}
          </Fragment>
        )
      )
      const bodyHtml = await renderNode(body)
      const styles = assets.styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('')
      const browserConfig = {
        dev: config.server.development,
        rscPath: '/_rakun/rsc',
      }
      const initialAssets = serializeScriptValue(assets)
      const navigation = manifest.navigation
        ? `<script type="module" src="${manifest.navigation}"></script>`
        : ''
      const html = [
        '<!doctype html>',
        `<html${toAttributes(document.htmlAttributes)}>`,
        '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
        head,
        styles,
        '</head>',
        `<body${toAttributes(document.bodyAttributes)}><div id="rakun-root">`,
        bodyHtml,
        '</div>',
        `<script>window.__RAKUN_BUN__=${serializeScriptValue(browserConfig)}</script>`,
        `<script type="application/json" data-rakun-assets>${initialAssets}</script>`,
        navigation,
        '</body></html>',
      ].join('')

      return {
        path,
        html,
        flight: {
          assets,
          head,
          html: bodyHtml,
          path,
        },
      }
    },
    page.literals
  )
}
