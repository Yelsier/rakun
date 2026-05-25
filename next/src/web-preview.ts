import type { PageOutput } from "@rakun-kit/core/contracts";

export const rakunPreviewMessageType = "rakun:preview:update";
export const rakunPreviewReadyMessageType = "rakun:preview:ready";

const previewPageConfigSymbol = Symbol.for("rakun.previewPageConfig");

export type RakunPreviewPageConfig = {
  tokenParam: string;
};

export type RakunPreviewUpdateMessage = {
  type: typeof rakunPreviewMessageType;
  href?: string;
  path: string;
  token: string;
  tokenParam?: string;
};

type PageWithPreviewConfig = PageOutput & {
  [previewPageConfigSymbol]?: RakunPreviewPageConfig;
};

export const markRakunPreviewPage = (
  page: PageOutput,
  config: RakunPreviewPageConfig,
) => {
  Object.defineProperty(page, previewPageConfigSymbol, {
    configurable: true,
    enumerable: false,
    value: config,
  });

  return page;
};

export const getRakunPreviewPageConfig = (page: PageOutput) =>
  (page as PageWithPreviewConfig)[previewPageConfigSymbol];
