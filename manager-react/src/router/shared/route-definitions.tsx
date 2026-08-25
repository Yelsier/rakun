import type { EncodedContentType } from "@rakun-kit/core/client";
import { Suspense, type ReactNode } from "react";

import { ManagerAuthLayout, ManagerDashboardLayout } from "../../layouts";
import { LoadingSpinner } from "../../components/loading-spinner";
import { managerRouteDefinitions } from "./route-list";
import { matchRoutePath, type AnyManagerRouteDefinition } from "./route-schema";
import { getManagerRelativePathname } from "../../state/navigation";
import {
  managerRoutePathsOverlap,
  type ManagerPluginRegistry,
} from '../../plugins'

import type {
  ManagerResolvedRoute,
  ManagerResolvedRouteKind,
  ManagerRouteRendererProps,
  ManagerSearchParams,
} from "./types";

const ManagerRouteLoadingFallback = () => (
  <div className="flex min-h-48 items-center justify-center">
    <LoadingSpinner />
  </div>
);

export const resolveManagerRoute = (args: {
  pathname: string;
  basePath?: string;
  searchParams?: ManagerSearchParams;
  pluginRegistry?: ManagerPluginRegistry;
  contentTypes?: { name: string }[];
}) => {
  const pathname =
    getManagerRelativePathname(args.pathname, {
      basePath: args.basePath,
    }).replace(/\/+$/, "") || "/";

  const contentRouteKinds = new Set([
    'content-list',
    'content-create',
    'content-edit',
  ])
  const staticDefinitions = managerRouteDefinitions.filter(
    (definition) => !contentRouteKinds.has(definition.kind),
  )
  const contentDefinitions = managerRouteDefinitions.filter((definition) =>
    contentRouteKinds.has(definition.kind),
  )

  for (const pluginRoute of args.pluginRegistry?.routes ?? []) {
    const firstSegment = pluginRoute.path.split('/').filter(Boolean)[0]
    if (firstSegment?.startsWith(':')) {
      throw new Error(
        `Rakun manager plugin route "${pluginRoute.path}" must begin with a static path segment.`,
      )
    }

    const reservedDefinition = staticDefinitions.find((definition) =>
      managerRoutePathsOverlap(definition.path, pluginRoute.path),
    )
    if (reservedDefinition) {
      throw new Error(
        `Rakun manager plugin route "${pluginRoute.path}" conflicts with built-in route "${reservedDefinition.kind}".`,
      )
    }

    if (
      firstSegment &&
      args.contentTypes?.some((contentType) => contentType.name === firstSegment)
    ) {
      throw new Error(
        `Rakun manager plugin route "${pluginRoute.path}" conflicts with content type "${firstSegment}".`,
      )
    }

  }

  for (const definition of staticDefinitions) {
    const params = matchRoutePath(definition.path, pathname);
    if (!params) continue;

    const route = definition.parse({
      params,
      searchParams: args.searchParams,
    });

    return { definition, route };
  }

  for (const pluginRoute of args.pluginRegistry?.routes ?? []) {
    const params = matchRoutePath(pluginRoute.path, pathname)
    if (!params) continue

    return {
      route: {
        kind: 'plugin',
        pluginId: pluginRoute.pluginId,
        routeId: pluginRoute.id,
        params,
      } as const,
      definition: undefined,
    }
  }

  for (const definition of contentDefinitions) {
    const params = matchRoutePath(definition.path, pathname)
    if (!params) continue

    const route = definition.parse({ params, searchParams: args.searchParams })
    return { definition, route }
  }

  return {
    route: { kind: "unknown", pathname } as const,
    definition: undefined,
  };
};

export const getManagerRouteDefinition = (kind: ManagerResolvedRouteKind) =>
  managerRouteDefinitions.find((definition) => definition.kind === kind);

export const renderManagerRoute = (args: {
  definition: AnyManagerRouteDefinition;
  route: Exclude<ManagerResolvedRoute, { kind: "unknown" }>;
  props: ManagerRouteRendererProps;
}) => {
  const { definition, route, props } = args;
  const { pathname, basePath, siteUrl, contentTypes = [] } = props;

  const matchedContentType =
    "contentType" in route
      ? contentTypes.find((item) => item.name === route.contentType)
      : undefined;

  const children = (
    <Suspense fallback={<ManagerRouteLoadingFallback />}>
      {definition.render(route as never, props, matchedContentType)}
    </Suspense>
  );
  const headerEnd = definition.headerEnd?.(
    route as never,
    props,
    matchedContentType,
  );

  if (definition.layout === "auth") {
    return (
      props.renderAuthLayout?.({
        children,
        route,
        pathname,
        basePath,
        siteUrl,
        contentTypes,
      }) ?? <ManagerAuthLayout>{children}</ManagerAuthLayout>
    );
  }

  return (
    props.renderDashboardLayout?.({
      children,
      route,
      pathname,
      basePath,
      contentTypes,
      headerEnd,
    }) ?? (
      <ManagerDashboardLayout
        route={route}
        contentTypes={contentTypes}
        pathname={pathname}
        basePath={basePath}
        siteUrl={siteUrl}
        headerEnd={headerEnd}
      >
        {children}
      </ManagerDashboardLayout>
    )
  );
};
