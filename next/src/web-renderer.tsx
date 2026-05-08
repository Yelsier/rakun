import type { ComponentType, ReactNode } from "react";
import type { PageModule, PageOutput } from "@rakun-kit/core/contracts";
import { getPageLayout } from "@rakun-kit/core/web";

export type RakunPageModuleImport = {
  default?: ComponentType<PageModule>;
  component?: ComponentType<PageModule>;
};

export type RakunPageModuleLoader = (
  name: string,
) => Promise<RakunPageModuleImport>;

export type RakunPageRendererProps = {
  page: PageOutput;
  loadModule: RakunPageModuleLoader;
  renderContent?: (children: ReactNode, index: number) => ReactNode;
};

const resolveModuleComponent = (
  name: string,
  moduleImport: RakunPageModuleImport,
) => {
  const Component = moduleImport.default ?? moduleImport.component;

  if (!Component) {
    throw new Error(`Module "${name}" must export a default component.`);
  }

  return Component;
};

export async function RakunPageRenderer({
  page,
  loadModule,
  renderContent = (children, index) => (
    <main key={`content:${index}`}>{children}</main>
  ),
}: RakunPageRendererProps) {
  const layout = getPageLayout(page);
  const rendered: ReactNode[] = [];

  const renderModule = async (module: PageModule, key: string) => {
    const Component = resolveModuleComponent(
      module._type,
      await loadModule(module._type),
    );

    return <Component key={key} {...module} />;
  };

  for (const [layoutIndex, item] of layout.entries()) {
    if (item.type === "module") {
      if (!item.module) {
        continue;
      }

      rendered.push(
        await renderModule(
          item.module,
          `layout:${item.key}:${item.module._id}`,
        ),
      );
      continue;
    }

    const children = await Promise.all(
      item.modules.map((module, moduleIndex) =>
        renderModule(module, `content:${module._id}:${moduleIndex}`),
      ),
    );

    rendered.push(renderContent(children, layoutIndex));
  }

  return <>{rendered}</>;
}
