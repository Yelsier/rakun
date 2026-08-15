import type { ComponentType, ReactNode } from 'react'
import { permanentRedirect, redirect } from 'next/navigation'
import type { PageModule, PageOutput } from '@rakun-kit/core/contracts'
import { getPageLayout } from '@rakun-kit/core/web'
import {
  getRakunBuiltinModuleComponent,
  getRegistryRecord,
  mergeRakunModuleRegistries,
  type RakunModuleRegistry,
  type RakunWebPluginDefinition,
} from '@rakun-kit/react'

import { PageInfoProvider, runWithPageInfo } from './translation'
import { RakunDevToolbar, type RakunDevToolbarModule } from './web-dev-toolbar'
import {
  RakunModuleInstrumentation,
  type RakunModuleInstrumentationMeta,
} from './web-module-instrumentation'
import { RakunPreviewBridge } from './web-preview-bridge'
import { getRakunPreviewPageConfig } from './web-preview'

export type RakunPageModuleImport = {
  default?: ComponentType<PageModule>
  component?: ComponentType<PageModule>
}

export type RakunPageModuleLoader = (name: string) => Promise<RakunPageModuleImport>

export const createRakunPageModuleLoader = ({
  modules,
  plugins,
  fallback,
}: {
  modules?: RakunModuleRegistry
  plugins?: readonly RakunWebPluginDefinition[]
  fallback?: RakunPageModuleLoader
}): RakunPageModuleLoader => {
  const registry = mergeRakunModuleRegistries({ modules, plugins })

  return async (name) => {
    const entry = registry[name]
    if (!entry) {
      if (fallback) return fallback(name)
      throw new Error(`Rakun web module "${name}" is not registered.`)
    }

    const record = getRegistryRecord(entry)
    if (record.load) return (await record.load()) as RakunPageModuleImport
    if (record.component) {
      return { component: record.component }
    }

    throw new Error(`Rakun web module "${name}" has no component or loader.`)
  }
}

export type RakunPageRendererProps = {
  page: PageOutput
  loadModule: RakunPageModuleLoader
  renderContent?: (children: ReactNode, index: number) => ReactNode
  devToolbar?: boolean | RakunDevToolbarOptions
}

export type RakunDevToolbarOptions = {
  managerBasePath?: string
  initialOpen?: boolean
}

type PreviewModuleRenderMeta = {
  entryType: 'content' | 'layout' | 'template'
  index: number
  layoutIndex: number
  layoutKey?: string
  moduleIndex?: number
}

export const resolveRakunDevToolbarOptions = (
  value: RakunPageRendererProps['devToolbar']
): RakunDevToolbarOptions | null => {
  if (value === false) return null
  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return null
  }

  if (value === true) return {}
  if (value) return value
  return {}
}

const getStringInfo = (info: PageOutput['info'], key: string) => {
  const value = info?.[key]
  return typeof value === 'string' && value ? value : undefined
}

export const getRakunManagerEditHref = ({
  managerBasePath = '/backend',
  documentType,
  documentId,
}: RakunDevToolbarOptions & {
  documentType?: string
  documentId?: string
}) => {
  if (!documentType || !documentId) return undefined

  const base = managerBasePath.replace(/\/+$/, '')
  return `${base}/${encodeURIComponent(documentType)}/${encodeURIComponent(documentId)}`
}

const resolveModuleComponent = (name: string, moduleImport: RakunPageModuleImport) => {
  const Component = moduleImport.default ?? moduleImport.component

  if (!Component) {
    throw new Error(`Module "${name}" must export a default component.`)
  }

  return Component
}

export async function RakunPageRenderer({
  page,
  loadModule,
  devToolbar,
  renderContent = (children, index) => <main key={`content:${index}`}>{children}</main>,
}: RakunPageRendererProps) {
  if (page.redirect) {
    if (page.redirect.status === 301 || page.redirect.status === 308) {
      permanentRedirect(page.redirect.to)
    }

    redirect(page.redirect.to)
  }

  return runWithPageInfo(
    page.info,
    async () => {
      const layout = getPageLayout(page)
      const previewConfig = getRakunPreviewPageConfig(page)
      const toolbarOptions = previewConfig ? null : resolveRakunDevToolbarOptions(devToolbar)
      const rendered: ReactNode[] = []
      const toolbarModules: RakunDevToolbarModule[] = []
      let pageModuleIndex = 0

      const renderModule = async (
        module: PageModule,
        key: string,
        meta: PreviewModuleRenderMeta
      ) => {
        const Component =
          getRakunBuiltinModuleComponent(module._type) ??
          resolveModuleComponent(module._type, await loadModule(module._type))

        if (!previewConfig && !toolbarOptions) {
          return <Component key={key} {...module} />
        }

        if (toolbarOptions) {
          toolbarModules.push({ module, ...meta })
        }

        const instrumentationMeta: RakunModuleInstrumentationMeta = {
          entryType: meta.entryType,
          index: meta.index,
          layoutIndex: meta.layoutIndex,
          layoutKey: meta.layoutKey,
          moduleId: module._id,
          moduleIndex: meta.moduleIndex,
          moduleType: module._type,
        }

        return (
          <RakunModuleInstrumentation key={key} __rakunModuleBoundary meta={instrumentationMeta}>
            <Component {...module} />
          </RakunModuleInstrumentation>
        )
      }

      for (const [layoutIndex, item] of layout.entries()) {
        if (item.type === 'module') {
          if (!item.module) {
            continue
          }

          const index = pageModuleIndex++
          rendered.push(
            await renderModule(item.module, `layout:${item.key}:${item.module._id}`, {
              entryType: 'layout',
              index,
              layoutIndex,
              layoutKey: item.key,
            })
          )
          continue
        }

        const children = await Promise.all(
          item.modules.map((module, moduleIndex) => {
            const index = pageModuleIndex++

            return renderModule(module, `content:${module._id}:${moduleIndex}`, {
              entryType: page.templateModuleIds?.includes(module._id) ? 'template' : 'content',
              index,
              layoutIndex,
              moduleIndex,
            })
          })
        )

        rendered.push(renderContent(children, layoutIndex))
      }

      return (
        <PageInfoProvider value={page.info} literals={page.literals}>
          {previewConfig ? (
            <RakunPreviewBridge
              language={page.language?.code}
              seo={page.seo}
              tokenParam={previewConfig.tokenParam}
            />
          ) : null}
          {rendered}
          {toolbarOptions ? (
            <RakunDevToolbar
              modules={toolbarModules.sort((a, b) => a.index - b.index)}
              renderMode={page.renderMode}
              language={page.language?.code}
              documentType={getStringInfo(page.info, '_type')}
              documentId={getStringInfo(page.info, '_id')}
              editHref={getRakunManagerEditHref({
                ...toolbarOptions,
                documentType: getStringInfo(page.info, '_type'),
                documentId: getStringInfo(page.info, '_id'),
              })}
              initialOpen={toolbarOptions.initialOpen}
            />
          ) : null}
        </PageInfoProvider>
      )
    },
    page.literals
  )
}
