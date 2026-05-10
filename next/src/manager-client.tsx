"use client";

import { ManagerBrowserApp } from "@rakun-kit/manager-react/app/runtime-app";
import { createHttpManagerClient } from "@rakun-kit/manager-react/client/http";
import type { ManagerClient } from "@rakun-kit/manager-react/client/request";
import "@rakun-kit/manager-react/styles.css";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";

import type {
  RakunManagerPageParams,
  RakunManagerPageSearchParams,
} from "./manager";

export type RakunManagerClientPageProps = {
  params?: Promise<RakunManagerPageParams>;
  searchParams?: Promise<RakunManagerPageSearchParams>;
  initialPathname?: string;
  initialSearchParams?: string;
  apiBaseUrl?: string;
  managerClient?: ManagerClient;
  basePath: string;
  paramKey: string;
  loadingFallback?: ReactNode;
  unauthenticatedFallback?: ReactNode;
};

const subscribeToLocation = (onStoreChange: () => void) => {
  window.addEventListener("popstate", onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
  };
};

const getBrowserLocationKey = () =>
  `${window.location.pathname}${window.location.search}`;

const createServerLocationKey = (pathname: string, searchParams: string) =>
  `${pathname}${searchParams ? `?${searchParams}` : ""}`;

export function RakunManagerClientPage({
  params: _paramsPromise,
  searchParams: _searchParamsPromise,
  initialPathname = "/",
  initialSearchParams = "",
  apiBaseUrl = "/api",
  managerClient,
  basePath,
  paramKey: _paramKey,
  loadingFallback,
  unauthenticatedFallback,
}: RakunManagerClientPageProps) {
  const locationKey = useSyncExternalStore(
    subscribeToLocation,
    getBrowserLocationKey,
    () => createServerLocationKey(initialPathname, initialSearchParams),
  );
  const client = useMemo(
    () =>
      managerClient ??
      createHttpManagerClient({
        baseUrl: apiBaseUrl,
      }),
    [apiBaseUrl, managerClient],
  );
  const pathname =
    typeof window === "undefined" ? initialPathname : window.location.pathname;
  const searchParams = useMemo(
    () =>
      new URLSearchParams(
        typeof window === "undefined"
          ? initialSearchParams
          : window.location.search,
      ),
    [initialSearchParams, locationKey],
  );

  return (
    <ManagerBrowserApp
      client={client}
      pathname={pathname}
      searchParams={searchParams}
      basePath={basePath}
      loadingFallback={loadingFallback}
      unauthenticatedFallback={unauthenticatedFallback}
    />
  );
}
