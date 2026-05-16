import type { EncodedContentType } from "@rakun-kit/core/client";
import type { ReactNode } from "react";

import { ManagerAuthLayout, ManagerDashboardLayout } from "../../layouts";
import { managerRouteDefinitions } from "./route-list";
import { matchRoutePath, type AnyManagerRouteDefinition } from "./route-schema";
import { getManagerRelativePathname } from "../../state/navigation";

import type {
  ManagerResolvedRoute,
  ManagerResolvedRouteKind,
  ManagerRouteRendererProps,
  ManagerSearchParams,
} from "./types";

export const resolveManagerRoute = (args: {
  pathname: string;
  basePath?: string;
  searchParams?: ManagerSearchParams;
}) => {
  const pathname =
    getManagerRelativePathname(args.pathname, {
      basePath: args.basePath,
    }).replace(/\/+$/, "") || "/";

  for (const definition of managerRouteDefinitions) {
    const params = matchRoutePath(definition.path, pathname);
    if (!params) continue;

    const route = definition.parse({
      params,
      searchParams: args.searchParams,
    });

    return { definition, route };
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
  const { pathname, basePath, contentTypes = [] } = props;

  const matchedContentType =
    "contentType" in route
      ? contentTypes.find((item) => item.name === route.contentType)
      : undefined;

  const children = definition.render(route as never, props, matchedContentType);

  if (definition.layout === "auth") {
    return (
      props.renderAuthLayout?.({
        children,
        route,
        pathname,
        basePath,
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
    }) ?? (
      <ManagerDashboardLayout
        route={route}
        contentTypes={contentTypes}
        pathname={pathname}
        basePath={basePath}
      >
        {children}
      </ManagerDashboardLayout>
    )
  );
};
