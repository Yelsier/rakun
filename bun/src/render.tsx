import { Buffer } from 'node:buffer'

import { Fragment, createElement, type ComponentType, type ReactNode } from 'react'
import { renderToReadableStream } from 'react-dom/server.browser'
import type { PageModule, PageOutput } from '@rakun-kit/core/contracts'
import { getPageLayout } from '@rakun-kit/core/web'
import { PageInfoProvider, getRakunBuiltinModuleComponent, runWithPageInfo } from '@rakun-kit/react'

import type {
  RakunBuildManifest,
  RakunBunDevtoolsModule,
  RakunBunDevtoolsPayload,
  RakunBunDocumentImport,
  RakunBunPageAssets,
  RakunServerModuleRegistry,
  RenderedRoute,
  ResolvedRakunBunConfig,
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

const renderNode = async (node: ReactNode, identifierPrefix?: string): Promise<string> => {
  const stream = await renderToReadableStream(node, { identifierPrefix })
  await stream.allReady
  return await new Response(stream).text()
}

const getIdentifierPrefix = (key: string): string => {
  let hash = 2_166_136_261
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return `rakun-${(hash >>> 0).toString(36)}-`
}

const RakunBunNotFound = (): null => null

const markHeadElements = (html: string): string =>
  html.replace(/<(title|meta|link|style|base)(?=[\s>])/g, '<$1 data-rakun-head=""')

const resolveComponent = (
  module: PageModule,
  registry: RakunServerModuleRegistry
): { client: boolean; Component: ComponentType<PageModule> } => {
  const entry = registry[module._type]
  if (!entry && module._type === 'NotFound') {
    return { client: false, Component: RakunBunNotFound }
  }

  const BuiltinComponent = getRakunBuiltinModuleComponent(module._type)
  if (BuiltinComponent) {
    return {
      client: false,
      Component: BuiltinComponent as ComponentType<PageModule>,
    }
  }

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

const markDevtoolsModules = (html: string): string =>
  html
    .replace(
      /<rakun-dev-boundary\b[^>]*data-rakun-index="(\d+)"[^>]*>/g,
      (_tag, index: string) => `<!--rakun-module-start:${index}-->`
    )
    .replace(/<\/rakun-dev-boundary>/g, '<!--rakun-module-end-->')

const renderPageBody = async (
  page: PageOutput,
  registry: RakunServerModuleRegistry,
  devtools: boolean
): Promise<{ body: ReactNode; devtoolsModules: RakunBunDevtoolsModule[] }> => {
  const rendered: ReactNode[] = []
  const devtoolsModules: RakunBunDevtoolsModule[] = []

  const renderModule = async (
    module: PageModule,
    key: string,
    meta: Omit<RakunBunDevtoolsModule, 'module'>
  ): Promise<ReactNode> => {
    const { client, Component } = resolveComponent(module, registry)
    const component = createElement(Component, { ...module, key })
    let renderedModule: ReactNode

    if (client) {
      const identifierPrefix = getIdentifierPrefix(key)
      const html = await renderNode(
        <PageInfoProvider value={page.info} literals={page.literals}>
          {component}
        </PageInfoProvider>,
        identifierPrefix
      )
      renderedModule = (
        <div
          data-rakun-client={module._type}
          data-rakun-identifier-prefix={identifierPrefix}
          data-rakun-props={encodeProps(module)}
          dangerouslySetInnerHTML={{ __html: html }}
          key={key}
        />
      )
    } else {
      renderedModule =
        module._type === 'NotFound' ? (
          <div data-rakun-not-found="" key={key}>
            {component}
          </div>
        ) : (
          component
        )
    }

    if (!devtools) return renderedModule
    devtoolsModules.push({ module, ...meta })
    return createElement(
      'rakun-dev-boundary',
      { 'data-rakun-index': meta.index, key: `devtools:${key}` },
      renderedModule
    )
  }

  const templateModuleIds = new Set(page.templateModuleIds)
  let pageModuleIndex = 0
  for (const [layoutIndex, item] of getPageLayout(page).entries()) {
    if (item.type === 'module') {
      if (item.module) {
        const index = pageModuleIndex++
        rendered.push(
          await renderModule(item.module, `layout:${item.key}:${item.module._id}:${layoutIndex}`, {
            entryType: 'layout',
            index,
            layoutIndex,
            layoutKey: item.key,
          })
        )
      }
      continue
    }

    let contentModuleIndex = 0
    rendered.push(
      <main key={`content:${layoutIndex}`}>
        {await Promise.all(
          item.modules.map(async (module, moduleIndex) => {
            const index = pageModuleIndex++
            const template = templateModuleIds.has(module._id)
            return await renderModule(
              module,
              `content:${module._id}:${layoutIndex}:${moduleIndex}`,
              {
                entryType: template ? 'template' : 'content',
                index,
                layoutIndex,
                moduleIndex: template ? undefined : contentModuleIndex++,
              }
            )
          })
        )}
      </main>
    )
  }

  return {
    body: (
      <PageInfoProvider value={page.info} literals={page.literals}>
        {rendered}
      </PageInfoProvider>
    ),
    devtoolsModules,
  }
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

const injectBeforeClosingTag = (html: string, tag: 'body' | 'head', content: string): string => {
  const index = html.toLowerCase().lastIndexOf(`</${tag}>`)
  if (index < 0) {
    throw new Error(`Rakun src/document.tsx must render an <${tag}> element.`)
  }
  return `${html.slice(0, index)}${content}${html.slice(index)}`
}

const injectAfterOpeningTag = (html: string, tag: 'head', content: string): string => {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>`, 'i').exec(html)
  if (match?.index === undefined) {
    throw new Error(`Rakun src/document.tsx must render an <${tag}> element.`)
  }
  const index = match.index + match[0].length
  return `${html.slice(0, index)}${content}${html.slice(index)}`
}

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

const getStringInfo = (info: PageOutput['info'], key: string): string | undefined => {
  const value = info?.[key]
  return typeof value === 'string' && value ? value : undefined
}

const getManagerEditHref = (
  config: Partial<Pick<ResolvedRakunBunConfig, 'manager'>>,
  documentType?: string,
  documentId?: string
): string | undefined => {
  if (!config.manager || !documentType || !documentId) return undefined
  return `${config.manager.basePath.replace(/\/+$/, '')}/${encodeURIComponent(
    documentType
  )}/${encodeURIComponent(documentId)}`
}

export const renderRakunRoute = async ({
  config,
  document,
  manifest,
  page,
  path,
  registry,
  devtools = config.server.development,
  devtoolsPath = path,
}: {
  config: Pick<ResolvedRakunBunConfig, 'server'> &
    Partial<Pick<ResolvedRakunBunConfig, 'apiBasePath' | 'manager'>>
  document?: RakunBunDocumentImport
  manifest: RakunBuildManifest
  page: PageOutput
  path: string
  registry: RakunServerModuleRegistry
  devtools?: boolean
  devtoolsPath?: string
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
      const renderedPage = await renderPageBody(page, registry, devtools)
      const bodyHtml = devtools
        ? markDevtoolsModules(await renderNode(renderedPage.body))
        : await renderNode(renderedPage.body)
      const head = markHeadElements(await renderNode(<Fragment>{getSeoHead(page)}</Fragment>))
      const styles = assets.styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('')
      const browserConfig = {
        dev: config.server.development,
        reloadBasePaths: [
          config.apiBasePath ?? '/api',
          ...(config.manager ? [config.manager.basePath] : []),
          '/assets',
          '/_rakun',
        ],
        rscPath: '/_rakun/rsc',
      }
      const initialAssets = serializeScriptValue(assets)
      const documentType = getStringInfo(page.info, '_type')
      const documentId = getStringInfo(page.info, '_id')
      const devtoolsPayload: RakunBunDevtoolsPayload | undefined = devtools
        ? {
            modules: renderedPage.devtoolsModules.sort((left, right) => left.index - right.index),
            renderMode: page.renderMode,
            path: devtoolsPath,
            language: page.language?.code,
            documentType,
            documentId,
            editHref: getManagerEditHref(config, documentType, documentId),
          }
        : undefined
      const navigation = manifest.navigation
        ? `<script type="module" src="${manifest.navigation}"></script>`
        : ''
      const root = <div id="rakun-root" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      const Document = document?.default
      if (document && !Document) {
        throw new Error('Rakun src/document.tsx must export a default component.')
      }
      const documentNode = Document ? (
        <Document assets={assets} page={page} path={path}>
          {root}
        </Document>
      ) : (
        <html>
          <head />
          <body>{root}</body>
        </html>
      )
      let html = await renderNode(documentNode)
      if (!/<html(?:\s|>)/i.test(html)) {
        throw new Error('Rakun src/document.tsx must render an <html> element.')
      }
      html = injectAfterOpeningTag(
        html,
        'head',
        '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      )
      html = injectBeforeClosingTag(html, 'head', [head, styles].join(''))
      html = injectBeforeClosingTag(
        html,
        'body',
        [
          `<script>window.__RAKUN_BUN__=${serializeScriptValue(browserConfig)}</script>`,
          `<script type="application/json" data-rakun-assets>${initialAssets}</script>`,
          devtoolsPayload
            ? `<script type="application/json" data-rakun-devtools>${serializeScriptValue(
                devtoolsPayload
              )}</script>`
            : '',
          navigation,
        ].join('')
      )

      return {
        path,
        html,
        flight: {
          assets,
          ...(devtoolsPayload ? { devtools: devtoolsPayload } : {}),
          head,
          html: bodyHtml,
          path,
        },
      }
    },
    page.literals
  )
}
