import type { ComponentType, ReactNode } from "react";
import type { ManagerClient } from "@rakun-kit/manager-react/client/request";
import type { ManagerPreviewConfig } from "@rakun-kit/manager-react";
import { ManagerThemeScript } from "@rakun-kit/manager-react/state/theme-script";

import { RakunManagerClientPage } from "./manager-client";
import type { RakunManagerClientPageProps } from "./manager-client";

export type { RakunManagerClientPageProps } from "./manager-client";
export { RakunManagerClientPage } from "./manager-client";
export {
  createRakunManagerMetadata,
  type CreateRakunManagerMetadataOptions,
} from "./manager-metadata";

export type RakunManagerPageSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type RakunManagerPageParams = Record<
  string,
  string | string[] | undefined
>;

export type RakunManagerPageProps = {
  params: Promise<RakunManagerPageParams>;
  searchParams: Promise<RakunManagerPageSearchParams>;
};

export type RakunManagerPageOptions = {
  apiBaseUrl?: string;
  managerClient?: ManagerClient;
  basePath?: string;
  paramKey?: string;
  loadingFallback?: ReactNode;
  unauthenticatedFallback?: ReactNode;
  preview?: ManagerPreviewConfig;
  managerComponent?: ComponentType<RakunManagerClientPageProps>;
};

const defaultParamKey = "slug";

export type RakunManagerPageComponentProps = RakunManagerPageProps &
  RakunManagerPageOptions;

const createSearchParams = (values: RakunManagerPageSearchParams) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "undefined") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
      continue;
    }

    searchParams.set(key, value);
  }

  return searchParams;
};

const getPathSegments = (
  params: RakunManagerPageParams,
  paramKey: string,
): string[] => {
  const value = params[paramKey] ?? Object.values(params).find(Boolean);

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string" && value.length > 0) {
    return [value];
  }

  return [];
};

export async function RakunManagerPage({
  params,
  searchParams,
  apiBaseUrl = "/api",
  managerClient,
  basePath = "/backend",
  paramKey = defaultParamKey,
  loadingFallback,
  unauthenticatedFallback,
  preview,
  managerComponent: ManagerComponent = RakunManagerClientPage,
}: RakunManagerPageComponentProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const initialPathname = `/${getPathSegments(
    resolvedParams,
    paramKey,
  ).join("/")}`;
  const initialSearchParams = createSearchParams(
    resolvedSearchParams,
  ).toString();
  const normalizedPreview = preview
    ? {
        ...preview,
        webBaseUrl: preview.webBaseUrl.toString(),
      }
    : undefined;

  return (
    <>
      <ManagerThemeScript />
      <ManagerComponent
        apiBaseUrl={apiBaseUrl}
        managerClient={managerClient}
        basePath={basePath}
        paramKey={paramKey}
        initialPathname={initialPathname}
        initialSearchParams={initialSearchParams}
        loadingFallback={loadingFallback}
        unauthenticatedFallback={unauthenticatedFallback}
        preview={normalizedPreview}
      />
    </>
  );
}
