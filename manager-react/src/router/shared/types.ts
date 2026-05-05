import type { EncodedContentType } from "@rakun-kit/core/client";
import type { ReactNode } from "react";

import type { ManagerLayoutRendererProps } from "../../layouts";

export type ManagerResolvedRoute =
  | { kind: "login" }
  | { kind: "mfa"; challenge?: string; method?: string; expiresAt?: string }
  | { kind: "dashboard-home" }
  | { kind: "account" }
  | { kind: "media-library" }
  | { kind: "api-routes" }
  | { kind: "users" }
  | { kind: "settings-home" }
  | { kind: "settings-languages" }
  | { kind: "settings-routes" }
  | { kind: "settings-route-paths" }
  | { kind: "settings-user-roles" }
  | { kind: "settings-user-roles-create" }
  | { kind: "settings-user-roles-edit"; id: string }
  | { kind: "settings-literals" }
  | { kind: "settings-redirects" }
  | { kind: "content-list"; contentType: string }
  | { kind: "content-create"; contentType: string }
  | { kind: "content-edit"; contentType: string; id: string }
  | { kind: "unknown"; pathname: string };

export type ManagerResolvedRouteKind = Exclude<
  ManagerResolvedRoute["kind"],
  "unknown"
>;

export type ManagerSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | undefined;

export type ManagerRouteRendererProps = {
  authenticated?: boolean;
  route: ManagerResolvedRoute;
  contentTypes?: EncodedContentType[];
  pathname?: string;
  basePath?: string;
  renderLogin?: () => ReactNode;
  renderMfa?: (
    route: Extract<ManagerResolvedRoute, { kind: "mfa" }>,
  ) => ReactNode;
  renderDashboardHome?: (
    route: Extract<ManagerResolvedRoute, { kind: "dashboard-home" }>,
  ) => ReactNode;
  renderSettingsHome?: (
    route: Extract<ManagerResolvedRoute, { kind: "settings-home" }>,
  ) => ReactNode;
  renderContentCreate?: (
    route: Extract<ManagerResolvedRoute, { kind: "content-create" }>,
    contentType?: EncodedContentType,
  ) => ReactNode;
  renderContentEdit?: (
    route: Extract<ManagerResolvedRoute, { kind: "content-edit" }>,
    contentType?: EncodedContentType,
  ) => ReactNode;
  renderUnknown?: (
    route: Extract<ManagerResolvedRoute, { kind: "unknown" }>,
  ) => ReactNode;
  renderAuthLayout?: (props: ManagerLayoutRendererProps) => ReactNode;
  renderDashboardLayout?: (props: ManagerLayoutRendererProps) => ReactNode;
};

export type ManagerAppOverrides = Omit<
  ManagerRouteRendererProps,
  "route" | "pathname" | "contentTypes"
>;

export type ManagerAppProps = Omit<ManagerRouteRendererProps, "route"> & {
  pathname: string;
  searchParams?: ManagerSearchParams;
};
