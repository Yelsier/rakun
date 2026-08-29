import type { ComponentType, ReactNode } from 'react'
import type { AcceptedPlugin } from 'postcss'
import type { RakunBootstrapOptions } from '@rakun-kit/core'
import type {
  PageInput,
  PageModule,
  PageOutput,
  StaticPathsOutput,
} from '@rakun-kit/core/contracts'

export type MaybePromise<T> = T | Promise<T>

export type RakunBunDocumentProps = {
  assets: RakunBunPageAssets
  children: ReactNode
  page: PageOutput
  path: string
}

export type RakunBunDocumentImport = {
  default?: ComponentType<RakunBunDocumentProps>
}

export type RakunBunWebSource = {
  getPage(input: PageInput): MaybePromise<PageOutput>
  getStaticPaths(): MaybePromise<StaticPathsOutput>
}

export type RakunBunManagerOptions = {
  basePath?: string
  preview?: false | RakunBunManagerPreviewOptions
}

export type RakunBunManagerPreviewOptions = {
  webBaseUrl?: string | URL
  tokenParam?: string
}

export type RakunBunRevalidationOptions = {
  path?: string
  token: string
}

export type RakunBunServerOptions = {
  hostname?: string
  port?: number
  development?: boolean
}

export type RakunBunCssOptions = {
  /** PostCSS plugins applied to CSS imported from this application's source tree. */
  plugins?: AcceptedPlugin[]
}

export type RakunBunConfig = {
  apiBasePath?: string
  bootstrap?: RakunBootstrapOptions | (() => RakunBootstrapOptions)
  css?: RakunBunCssOptions
  manager?: false | RakunBunManagerOptions
  modulesDir?: string
  outDir?: string
  rootDir?: string
  server?: RakunBunServerOptions
  web?: RakunBunWebSource
  revalidation?: RakunBunRevalidationOptions
}

export type ResolvedRakunBunConfig = Omit<
  RakunBunConfig,
  'apiBasePath' | 'manager' | 'modulesDir' | 'outDir' | 'rootDir' | 'server'
> & {
  apiBasePath: string
  documentFile: string
  manager:
    | false
    | {
        basePath: string
        preview: false | { webBaseUrl: string; tokenParam: string }
      }
  modulesDir: string
  outDir: string
  rootDir: string
  server: Required<RakunBunServerOptions>
}

export type RakunModuleDefinition = {
  client: boolean
  file: string
  name: string
}

export type RakunModuleImport = {
  component?: React.ComponentType<PageModule>
  default?: React.ComponentType<PageModule>
}

export type RakunServerModule = RakunModuleDefinition & {
  module: RakunModuleImport
}

export type RakunServerModuleRegistry = Record<string, RakunServerModule>

export type RakunClientManifestEntry = {
  chunk: string
  styles?: string[]
}

export type RakunClientManifest = Record<string, RakunClientManifestEntry>

export type RakunBuildManifest = {
  assets: string[]
  client: RakunClientManifest
  managerAssets: string[]
  modules: RakunModuleDefinition[]
  navigation: string
}

export type RakunBunPageAssets = {
  clientModules: string[]
  scripts: string[]
  styles: string[]
}

export type RakunBunDevtoolsModule = {
  module: PageModule
  entryType: 'content' | 'layout' | 'template'
  index: number
  layoutIndex: number
  layoutKey?: string
  moduleIndex?: number
}

export type RakunBunDevtoolsPayload = {
  modules: RakunBunDevtoolsModule[]
  renderMode: PageOutput['renderMode']
  path: string
  language?: string
  documentType?: string
  documentId?: string
  editHref?: string
}

export type RakunFlightPayload = {
  assets: RakunBunPageAssets
  devtools?: RakunBunDevtoolsPayload
  head: string
  html: string
  path: string
  redirect?: {
    status: number
    to: string
  }
}

export type RenderedRoute = {
  flight: RakunFlightPayload
  html: string
  path: string
}

export type RakunBuiltRoute = {
  assets: RakunBunPageAssets
  flightBytes: number
  htmlBytes: number
  path: string
}

export type RakunBunBuildResult = {
  manifest: RakunBuildManifest
  outDir: string
  routes: RakunBuiltRoute[]
  staticPaths: string[]
}
