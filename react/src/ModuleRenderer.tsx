"use client";

import {
  Suspense,
  lazy,
  useMemo,
  type ComponentType,
  type ReactNode,
} from "react";
import type { PageModule, PageOutput } from "@rakun-kit/core/contracts";
import {
  getPageLayout,
  type PageLayout,
  type PageLayoutContentItem,
  type PageLayoutModuleItem,
  type PageModuleEntry,
  iteratePageModules,
} from "@rakun-kit/core/web";
import { ModuleErrorBoundary } from "./ErrorBoundary";
import { getRakunBuiltinModuleComponent } from './builtin-modules'
import { LazyViewport } from "./LazyViewport";
import { runWithPageInfo } from "./pageInfoStore";
import {
  getRegistryRecord,
  resolveModuleImport,
  type MissingModuleRenderer,
  type ModuleErrorRenderer,
  type ModuleRendererFallback,
  type RakunModuleComponent,
  type RakunModuleLoader,
  type RakunModuleRegistry,
} from "./registry";

export type ModuleRenderContext<TModule extends PageModule = PageModule> = {
  module: TModule;
  index: number;
  entry: PageModuleEntry;
};

export type ModuleRendererProps<TModule extends PageModule = PageModule> = {
  modules?: TModule[];
  page?: Pick<PageOutput, "layout" | "modules" | "info">;
  layout?: PageLayout;
  registry?: RakunModuleRegistry<TModule>;
  loadModule?: (name: string) => Promise<unknown>;
  fallback?: ModuleRendererFallback<TModule>;
  missing?: MissingModuleRenderer<TModule>;
  error?: ModuleErrorRenderer<TModule>;
  eager?: number;
  lazy?: boolean;
  rootMargin?: string;
  threshold?: number | number[];
  getKey?: (context: ModuleRenderContext<TModule>) => string;
};

export type PageLayoutRenderContext<TModule extends PageModule = PageModule> = {
  item: PageLayoutContentItem;
  modules: TModule[];
  children: ReactNode;
  index: number;
};

export type PageLayoutRendererProps<TModule extends PageModule = PageModule> =
  ModuleRendererProps<TModule> & {
    renderContent?: (context: PageLayoutRenderContext<TModule>) => ReactNode;
  };

const lazyComponentCache = new WeakMap<
  () => Promise<unknown>,
  ComponentType<PageModule>
>();

const defaultGetKey = <TModule extends PageModule>({
  module,
  index,
}: ModuleRenderContext<TModule>): string => `${module._id}:${index}`;

const renderFallback = <TModule extends PageModule>(
  fallback: ModuleRendererFallback<TModule> | undefined,
  module: TModule,
  index: number,
): ReactNode => {
  if (typeof fallback === "function") {
    return fallback({ module, index });
  }

  return fallback ?? null;
};

function getLazyComponent<TModule extends PageModule>(
  load: () => Promise<unknown>,
): RakunModuleComponent {
  const cached = lazyComponentCache.get(load);
  if (cached) return cached;

  const Component = lazy(async () => {
    const moduleImport = await load();
    const resolved = resolveModuleImport(moduleImport as never);
    return { default: resolved.component as ComponentType<PageModule> };
  });

  lazyComponentCache.set(load, Component);

  return Component;
}

function ModuleView<TModule extends PageModule>({
  module,
  index,
  registry,
  loadModule,
  fallback,
  missing,
}: {
  module: TModule;
  index: number;
  registry?: RakunModuleRegistry<TModule>;
  loadModule?: (name: string) => Promise<unknown>;
  fallback?: ModuleRendererFallback<TModule>;
  missing?: MissingModuleRenderer<TModule>;
}) {
  const entry = registry?.[module._type];
  const BuiltinComponent = entry ? null : getRakunBuiltinModuleComponent(module._type)

  if (BuiltinComponent) {
    return <BuiltinComponent {...module} />
  }

  if (!entry && !loadModule) {
    return missing?.({ module, index }) ?? null;
  }

  const record = entry
    ? getRegistryRecord(entry)
    : { load: (() => loadModule?.(module._type)) as RakunModuleLoader };
  const Component =
    record.component ?? (record.load ? getLazyComponent(record.load) : null);
  const Fallback = record.fallback;

  if (!Component) {
    return missing?.({ module, index }) ?? null;
  }

  const fallbackNode = Fallback
    ? <Fallback {...module} />
    : renderFallback(fallback, module, index);

  return (
    <Suspense fallback={fallbackNode}>
      <Component {...module} />
    </Suspense>
  );
}

function RenderModule<TModule extends PageModule>({
  module,
  index,
  entry,
  registry,
  loadModule,
  fallback,
  missing,
  error,
  lazyByViewport,
  eager,
  rootMargin,
  threshold,
  getKey,
}: {
  module: TModule;
  index: number;
  entry: PageModuleEntry;
  registry?: RakunModuleRegistry<TModule>;
  loadModule?: (name: string) => Promise<unknown>;
  fallback?: ModuleRendererFallback<TModule>;
  missing?: MissingModuleRenderer<TModule>;
  error?: ModuleErrorRenderer<TModule>;
  lazyByViewport: boolean;
  eager: number;
  rootMargin?: string;
  threshold?: number | number[];
  getKey: (context: ModuleRenderContext<TModule>) => string;
}) {
  const context = {
    module,
    index,
    entry,
  };
  const fallbackNode = renderFallback(fallback, module, index);
  const node = (
    <ModuleErrorBoundary module={module} index={index} renderError={error}>
      <ModuleView
        module={module}
        index={index}
        registry={registry}
        loadModule={loadModule}
        fallback={fallback}
        missing={missing}
      />
    </ModuleErrorBoundary>
  );

  return (
    <Suspense key={getKey(context)} fallback={fallbackNode}>
      {lazyByViewport && index >= eager ? (
        <LazyViewport
          fallback={fallbackNode}
          rootMargin={rootMargin}
          threshold={threshold}
        >
          {node}
        </LazyViewport>
      ) : (
        node
      )}
    </Suspense>
  );
}

export function ModuleRenderer<TModule extends PageModule = PageModule>({
  modules,
  page,
  layout,
  registry,
  loadModule,
  fallback,
  missing,
  error,
  eager = 3,
  lazy: lazyByViewport = true,
  rootMargin,
  threshold,
  getKey = defaultGetKey,
}: ModuleRendererProps<TModule>) {
  const entries = useMemo(() => {
    const source =
      layout ??
      (page ? getPageLayout(page) : [{ type: "content" as const, modules: modules ?? [] }]);

    return iteratePageModules(source) as Array<PageModuleEntry & { module: TModule }>;
  }, [layout, modules, page]);

  const render = () => (
    <>
      {entries.map((entry) => {
        return (
          <RenderModule
            key={`${entry.module._id}:${entry.index}`}
            module={entry.module}
            index={entry.index}
            entry={entry}
            registry={registry}
            loadModule={loadModule}
            fallback={fallback}
            missing={missing}
            error={error}
            lazyByViewport={lazyByViewport}
            eager={eager}
            rootMargin={rootMargin}
            threshold={threshold}
            getKey={getKey}
          />
        );
      })}
    </>
  );

  return page ? runWithPageInfo(page.info, render) : render();
}

export function PageLayoutRenderer<TModule extends PageModule = PageModule>({
  modules,
  page,
  layout,
  registry,
  loadModule,
  fallback,
  missing,
  error,
  eager = 3,
  lazy: lazyByViewport = true,
  rootMargin,
  threshold,
  getKey = defaultGetKey,
  renderContent = ({ children }) => <main>{children}</main>,
}: PageLayoutRendererProps<TModule>) {
  const source = useMemo(
    () =>
      layout ??
      (page
        ? getPageLayout(page)
        : [{ type: "content" as const, modules: modules ?? [] }]),
    [layout, modules, page],
  );

  let moduleIndex = 0;

  const render = () => (
    <>
      {source.map((item, layoutIndex) => {
        if (item.type === "module") {
          const moduleItem = item as PageLayoutModuleItem;
          if (!moduleItem.module) return null;

          const index = moduleIndex++;
          const entry = {
            type: "layout" as const,
            key: moduleItem.key,
            module: moduleItem.module,
            index,
            layoutIndex,
          };

          return (
            <RenderModule
              key={`layout:${moduleItem.key}:${moduleItem.module._id}`}
              module={moduleItem.module as TModule}
              index={index}
              entry={entry}
              registry={registry}
              loadModule={loadModule}
              fallback={fallback}
              missing={missing}
              error={error}
              lazyByViewport={lazyByViewport}
              eager={eager}
              rootMargin={rootMargin}
              threshold={threshold}
              getKey={getKey}
            />
          );
        }

        const contentItem = item as PageLayoutContentItem;
        const contentModules = contentItem.modules as TModule[];
        const children = contentModules.map((module, contentIndex) => {
          const index = moduleIndex++;
          const entry = {
            type: "content" as const,
            module,
            index,
            layoutIndex,
            moduleIndex: contentIndex,
          };

          return (
            <RenderModule
              key={`content:${module._id}:${contentIndex}`}
              module={module}
              index={index}
              entry={entry}
              registry={registry}
              loadModule={loadModule}
              fallback={fallback}
              missing={missing}
              error={error}
              lazyByViewport={lazyByViewport}
              eager={eager}
              rootMargin={rootMargin}
              threshold={threshold}
              getKey={getKey}
            />
          );
        });

        return (
          <Suspense key={`content:${layoutIndex}`} fallback={null}>
            {renderContent({
              item: contentItem,
              modules: contentModules,
              children,
              index: layoutIndex,
            })}
          </Suspense>
        );
      })}
    </>
  );

  return page ? runWithPageInfo(page.info, render) : render();
}
