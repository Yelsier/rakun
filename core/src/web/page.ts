import type { PageModule, PageOutput } from "../schemas/web/page";

export type PageLayout = NonNullable<PageOutput["layout"]>;
export type PageLayoutItem = PageLayout[number];
export type PageLayoutContentItem = Extract<PageLayoutItem, { type: "content" }>;
export type PageLayoutModuleItem = Extract<PageLayoutItem, { type: "module" }>;

export type PageModuleEntry =
  | {
      type: "content";
      module: PageModule;
      index: number;
      layoutIndex: number;
      moduleIndex: number;
    }
  | {
      type: "layout";
      key: string;
      module: PageModule;
      index: number;
      layoutIndex: number;
    };

export const getPageLayout = (
  page: Pick<PageOutput, "layout" | "modules">,
): PageLayout => page.layout ?? [{ type: "content", modules: page.modules }];

export const getPageContentModules = (
  pageOrLayout: Pick<PageOutput, "layout" | "modules"> | PageLayout,
): PageModule[] => {
  const layout = Array.isArray(pageOrLayout)
    ? pageOrLayout
    : getPageLayout(pageOrLayout);

  return layout.flatMap((item) => (item.type === "content" ? item.modules : []));
};

export const getPageLayoutModuleItems = (
  pageOrLayout: Pick<PageOutput, "layout" | "modules"> | PageLayout,
): PageLayoutModuleItem[] => {
  const layout = Array.isArray(pageOrLayout)
    ? pageOrLayout
    : getPageLayout(pageOrLayout);

  return layout.filter(
    (item): item is PageLayoutModuleItem => item.type === "module",
  );
};

export const iteratePageModules = (
  pageOrLayout: Pick<PageOutput, "layout" | "modules"> | PageLayout,
): PageModuleEntry[] => {
  const layout = Array.isArray(pageOrLayout)
    ? pageOrLayout
    : getPageLayout(pageOrLayout);
  const entries: PageModuleEntry[] = [];

  for (const [layoutIndex, item] of layout.entries()) {
    if (item.type === "content") {
      for (const [moduleIndex, module] of item.modules.entries()) {
        entries.push({
          type: "content",
          module,
          index: entries.length,
          layoutIndex,
          moduleIndex,
        });
      }
      continue;
    }

    if (item.module) {
      entries.push({
        type: "layout",
        key: item.key,
        module: item.module,
        index: entries.length,
        layoutIndex,
      });
    }
  }

  return entries;
};

export const getPageModules = (
  pageOrLayout: Pick<PageOutput, "layout" | "modules"> | PageLayout,
): PageModule[] =>
  iteratePageModules(pageOrLayout).map((entry) => entry.module);

export const getPageModuleTypes = (
  pageOrLayout: Pick<PageOutput, "layout" | "modules"> | PageLayout,
): string[] => {
  const seen = new Set<string>();
  const types: string[] = [];

  for (const module of getPageModules(pageOrLayout)) {
    if (seen.has(module._type)) continue;
    seen.add(module._type);
    types.push(module._type);
  }

  return types;
};
