import { Fragment, type ReactNode } from 'react'
import type { PageModule } from '@rakun-kit/core/contracts'
import { getRakunBuiltinModuleComponent } from './builtin-modules'
import {
  getRegistryRecord,
  resolveModuleImport,
  type MissingModuleRenderer,
  type RakunModuleComponent,
  type RakunModuleImport,
  type RakunModuleRegistry,
} from './registry'

export type ServerModuleRenderContext<
  TModule extends PageModule = PageModule,
> = {
  module: TModule
  index: number
}

export type ServerModuleRendererProps<
  TModule extends PageModule = PageModule,
> = {
  modules?: TModule[]
  registry?: RakunModuleRegistry<TModule>
  loadModule?: (name: string) => Promise<unknown>
  missing?: MissingModuleRenderer<TModule>
  getKey?: (context: ServerModuleRenderContext<TModule>) => string
}

const defaultGetKey = <TModule extends PageModule>({
  module,
  index,
}: ServerModuleRenderContext<TModule>): string => `${module._id}:${index}`

const resolveComponent = async <TModule extends PageModule>(
  module: TModule,
  registry?: RakunModuleRegistry<TModule>,
  loadModule?: (name: string) => Promise<unknown>,
): Promise<RakunModuleComponent | null> => {
  const entry = registry?.[module._type]

  if (!entry) {
    const BuiltinComponent = getRakunBuiltinModuleComponent(module._type)
    if (BuiltinComponent) return BuiltinComponent

    if (!loadModule) return null

    const moduleImport = await loadModule(module._type)
    return resolveModuleImport(moduleImport as RakunModuleImport).component
  }

  const record = getRegistryRecord(entry)
  if (record.component) return record.component
  if (!record.load) return null

  const moduleImport = await record.load()
  return resolveModuleImport(moduleImport).component
}

export async function ServerModuleRenderer<
  TModule extends PageModule = PageModule,
>({
  modules = [],
  registry,
  loadModule,
  missing,
  getKey = defaultGetKey,
}: ServerModuleRendererProps<TModule>): Promise<ReactNode> {
  const rendered = await Promise.all(
    modules.map(async (module, index) => {
      const key = getKey({ module, index })
      const Component = await resolveComponent(module, registry, loadModule)

      if (!Component) {
        return (
          <Fragment key={key}>{missing?.({ module, index }) ?? null}</Fragment>
        )
      }

      return <Component key={key} {...module} />
    }),
  )

  return <Fragment>{rendered}</Fragment>
}
