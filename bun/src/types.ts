import type { ReactNode } from 'react'
import type { RakunBootstrapOptions } from '@rakun-kit/core'
import type {
  PageInput,
  PageModule,
  PageOutput,
  StaticPathsOutput,
} from '@rakun-kit/core/contracts'

export type MaybePromise<T> = T | Promise<T>

export type RakunBunDocumentContext = {
  assets: RakunBunPageAssets
  body: ReactNode
  page: PageOutput
  path: string
}

export type RakunBunDocument = {
  body?: ReactNode
  head?: ReactNode
  htmlAttributes?: Record<string, string>
  bodyAttributes?: Record<string, string>
}

export type RakunBunWebSource = {
  getPage(input: PageInput): MaybePromise<PageOutput>
  getStaticPaths(): MaybePromise<StaticPathsOutput>
}

export type RakunBunManagerOptions = {
  basePath?: string
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

export type RakunBunConfig = {
  apiBasePath?: string
  bootstrap?: RakunBootstrapOptions | (() => RakunBootstrapOptions)
  document?: (context: RakunBunDocumentContext) => MaybePromise<RakunBunDocument | ReactNode>
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
  manager: false | Required<RakunBunManagerOptions>
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

export type RakunFlightPayload = {
  assets: RakunBunPageAssets
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

export type RakunBunBuildResult = {
  manifest: RakunBuildManifest
  outDir: string
  staticPaths: string[]
}
