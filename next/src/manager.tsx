import type { ReactNode } from "react";
import type { ManagerClient } from "@rakun/manager-react/client/request";

import { RakunManagerClientPage } from "./manager-client";

export type { RakunManagerClientPageProps } from "./manager-client";
export { RakunManagerClientPage } from "./manager-client";

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
};

const defaultParamKey = "slug";

export type RakunManagerPageComponentProps = RakunManagerPageProps &
  RakunManagerPageOptions;

export function RakunManagerPage({
  params,
  searchParams,
  apiBaseUrl = "/api",
  managerClient,
  basePath = "/backend",
  paramKey = defaultParamKey,
  loadingFallback,
  unauthenticatedFallback,
}: RakunManagerPageComponentProps) {
  return (
    <RakunManagerClientPage
      params={params}
      searchParams={searchParams}
      apiBaseUrl={apiBaseUrl}
      managerClient={managerClient}
      basePath={basePath}
      paramKey={paramKey}
      loadingFallback={loadingFallback}
      unauthenticatedFallback={unauthenticatedFallback}
    />
  );
}
