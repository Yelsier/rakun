import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { PageModule, PageOutput } from "@rakun-kit/core/contracts";
import { getPageLayout } from "@rakun-kit/core/web";

import { PageInfoProvider, runWithPageInfo } from "./translation";
import { RakunPreviewBridge } from "./web-preview-bridge";
import { getRakunPreviewPageConfig } from "./web-preview";

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

type PreviewModuleRenderMeta = {
  entryType: "content" | "layout";
  index: number;
  layoutIndex: number;
  layoutKey?: string;
  moduleIndex?: number;
};

const previewModuleWrapperStyle = {
  display: "contents",
} satisfies CSSProperties;

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
  return runWithPageInfo(page.info, async () => {
    const layout = getPageLayout(page);
    const previewConfig = getRakunPreviewPageConfig(page);
    const rendered: ReactNode[] = [];
    let pageModuleIndex = 0;

    const renderModule = async (
      module: PageModule,
      key: string,
      meta: PreviewModuleRenderMeta,
    ) => {
      const Component = resolveModuleComponent(
        module._type,
        await loadModule(module._type),
      );

      const node = <Component key={previewConfig ? undefined : key} {...module} />;

      if (!previewConfig) {
        return node;
      }

      return (
        <span
          key={key}
          data-rakun-preview-module=""
          data-rakun-preview-entry-type={meta.entryType}
          data-rakun-preview-index={meta.index}
          data-rakun-preview-layout-index={meta.layoutIndex}
          data-rakun-preview-layout-key={meta.layoutKey}
          data-rakun-preview-module-id={module._id}
          data-rakun-preview-module-index={meta.moduleIndex}
          data-rakun-preview-module-type={module._type}
          style={previewModuleWrapperStyle}
          suppressHydrationWarning
        >
          {node}
        </span>
      );
    };

    for (const [layoutIndex, item] of layout.entries()) {
      if (item.type === "module") {
        if (!item.module) {
          continue;
        }

        const index = pageModuleIndex++;
        rendered.push(
          await renderModule(
            item.module,
            `layout:${item.key}:${item.module._id}`,
            {
              entryType: "layout",
              index,
              layoutIndex,
              layoutKey: item.key,
            },
          ),
        );
        continue;
      }

      const children = await Promise.all(
        item.modules.map((module, moduleIndex) => {
          const index = pageModuleIndex++;

          return renderModule(module, `content:${module._id}:${moduleIndex}`, {
            entryType: "content",
            index,
            layoutIndex,
            moduleIndex,
          });
        }),
      );

      rendered.push(renderContent(children, layoutIndex));
    }

    return (
      <PageInfoProvider value={page.info}>
        {previewConfig ? (
          <RakunPreviewBridge tokenParam={previewConfig.tokenParam} />
        ) : null}
        {rendered}
      </PageInfoProvider>
    );
  });
}
