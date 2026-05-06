import type { ComponentType, ReactNode } from "react";
import type { PageModule } from "@rakun-kit/core/contracts";

export type RakunModuleComponent = ComponentType<any>;

export type RakunModuleImport = {
  default?: RakunModuleComponent;
  component?: RakunModuleComponent;
  Fallback?: RakunModuleComponent;
  fallback?: RakunModuleComponent;
  isLazy?: boolean;
};

export type RakunModuleLoader = () => Promise<RakunModuleImport>;

export type RakunModuleRecord<TModule extends PageModule = PageModule> = {
  component?: RakunModuleComponent;
  fallback?: RakunModuleComponent;
  load?: RakunModuleLoader;
  isLazy?: boolean;
};

export type RakunModuleRegistryEntry<TModule extends PageModule = PageModule> =
  | RakunModuleLoader
  | RakunModuleRecord<TModule>;

export type RakunModuleRegistry<TModule extends PageModule = PageModule> =
  Record<string, RakunModuleRegistryEntry<TModule>>;

export type RakunModuleGlob = Record<string, RakunModuleLoader>;

export type CreateModuleRegistryFromGlobOptions = {
  getName?: (path: string) => string | null | undefined;
};

export type MissingModuleRenderArgs<TModule extends PageModule = PageModule> = {
  module: TModule;
  index: number;
};

export type ModuleFallbackRenderArgs<TModule extends PageModule = PageModule> = {
  module: TModule;
  index: number;
};

export type ModuleErrorRenderArgs<TModule extends PageModule = PageModule> = {
  error: unknown;
  module?: TModule;
  index?: number;
};

export type ModuleRendererFallback<TModule extends PageModule = PageModule> =
  | ReactNode
  | ((args: ModuleFallbackRenderArgs<TModule>) => ReactNode);

export type MissingModuleRenderer<TModule extends PageModule = PageModule> =
  (args: MissingModuleRenderArgs<TModule>) => ReactNode;

export type ModuleErrorRenderer<TModule extends PageModule = PageModule> =
  (args: ModuleErrorRenderArgs<TModule>) => ReactNode;

export const createModuleRegistry = <
  TRegistry extends RakunModuleRegistry<PageModule>,
>(
  registry: TRegistry,
): TRegistry => registry;

export const getModuleNameFromPath = (path: string): string | null => {
  const fileName = path.split("/").pop();
  if (!fileName) return null;

  const match = fileName.match(/^(.+?)\.(?:[cm]?[jt]sx?)$/);
  return match?.[1] ?? null;
};

export const createModuleRegistryFromGlob = (
  modules: RakunModuleGlob,
  options: CreateModuleRegistryFromGlobOptions = {},
): RakunModuleRegistry => {
  const registry: RakunModuleRegistry = {};
  const getName = options.getName ?? getModuleNameFromPath;

  for (const [path, load] of Object.entries(modules)) {
    const name = getName(path);
    if (!name) continue;
    registry[name] = load;
  }

  return registry;
};

export const getRegistryRecord = <TModule extends PageModule>(
  entry: RakunModuleRegistryEntry<TModule>,
): RakunModuleRecord<TModule> =>
  typeof entry === "function" ? { load: entry } : entry;

export const resolveModuleImport = <TModule extends PageModule>(
  moduleImport: RakunModuleImport,
): Required<Pick<RakunModuleRecord<TModule>, "component">> &
  Pick<RakunModuleRecord<TModule>, "fallback" | "isLazy"> => {
  const component = moduleImport.default ?? moduleImport.component;

  if (!component) {
    throw new Error("Rakun module import must export default or component.");
  }

  return {
    component,
    fallback: moduleImport.Fallback ?? moduleImport.fallback,
    isLazy: moduleImport.isLazy,
  };
};
