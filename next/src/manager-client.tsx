"use client";

import { ManagerBrowserApp } from "@rakun/manager-react/app/runtime-app";
import { createHttpManagerClient } from "@rakun/manager-react/client/http";
import type { ManagerClient } from "@rakun/manager-react/client/request";
import type { ManagerLinkProps } from "@rakun/manager-react/link";
import { createPathManagerNavigation } from "@rakun/manager-react/state/navigation";
import "@rakun/manager-react/styles.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo, type ReactNode } from "react";

import type {
  RakunManagerPageParams,
  RakunManagerPageSearchParams,
} from "./manager";

export type RakunManagerClientPageProps = {
  params: Promise<RakunManagerPageParams>;
  searchParams: Promise<RakunManagerPageSearchParams>;
  apiBaseUrl?: string;
  managerClient?: ManagerClient;
  basePath: string;
  paramKey: string;
  loadingFallback?: ReactNode;
  unauthenticatedFallback?: ReactNode;
};

function ManagerNextLink({ href, children, ...props }: ManagerLinkProps) {
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}

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

export function RakunManagerClientPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
  apiBaseUrl = "/api",
  managerClient,
  basePath,
  paramKey,
  loadingFallback,
  unauthenticatedFallback,
}: RakunManagerClientPageProps) {
  const router = useRouter();
  const client = useMemo(
    () =>
      managerClient ??
      createHttpManagerClient({
        baseUrl: apiBaseUrl,
      }),
    [apiBaseUrl, managerClient],
  );
  const params = use(paramsPromise);
  const nextSearchParams = use(searchParamsPromise);

  const pathname = `/${getPathSegments(params, paramKey).join("/")}`;
  const searchParams = useMemo(
    () => createSearchParams(nextSearchParams),
    [nextSearchParams],
  );
  const navigation = useMemo(
    () =>
      createPathManagerNavigation({
        basePath,
        push: (href) => router.push(href),
        replace: (href) => router.replace(href),
      }),
    [basePath, router],
  );

  return (
    <ManagerBrowserApp
      client={client}
      navigation={navigation}
      linkComponent={ManagerNextLink}
      pathname={pathname}
      searchParams={searchParams}
      basePath={basePath}
      loadingFallback={loadingFallback}
      unauthenticatedFallback={unauthenticatedFallback}
    />
  );
}
