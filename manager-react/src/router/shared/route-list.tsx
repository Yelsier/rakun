import { ManagerAccountScreen } from "../dashboard/account";
import { ManagerApiRoutesScreen } from "../dashboard/api-routes";
import { ManagerContentTypeListScreen } from "../dashboard/[contentType]/(list)";
import { ManagerContentTypeEditScreen } from "../dashboard/[contentType]/[edit]";
import { ManagerContentTypeCreateScreen } from "../dashboard/[contentType]/create";
import { ManagerDashboardHomeScreen } from "../dashboard";
import { ManagerLoginScreen } from "../login";
import { ManagerMediaLibraryScreen } from "../dashboard/media";
import { ManagerMfaScreen } from "../mfa";
import { ManagerSettingsLanguagesScreen } from "../dashboard/settings/languages";
import { ManagerSettingsLiteralsScreen } from "../dashboard/settings/literals";
import { ManagerSettingsRedirectsScreen } from "../dashboard/settings/redirects";
import { ManagerSettingsRoutePathsScreen } from "../dashboard/settings/routes/paths";
import { ManagerSettingsRoutesScreen } from "../dashboard/settings/routes";
import { ManagerSettingsHomeScreen } from "../dashboard/settings";
import { ManagerSettingsSystemScreen } from "../dashboard/settings/system";
import {
  ManagerSettingsUserRoleCreateScreen,
  ManagerSettingsUserRoleEditScreen,
  ManagerSettingsUserRolesScreen,
} from "../dashboard/settings/user-roles";
import { ManagerUsersScreen } from "../dashboard/users";

import {
  defineManagerRoute,
  getSearchParam,
  type AnyManagerRouteDefinition,
} from "./route-schema";

export const managerRouteDefinitions = [
  defineManagerRoute({
    kind: "login",
    path: "/login",
    layout: "auth",
    parse: () => ({ kind: "login" }),
    render: (_route, props) => props.renderLogin?.() ?? <ManagerLoginScreen />,
  }),
  defineManagerRoute({
    kind: "mfa",
    path: "/mfa",
    layout: "auth",
    parse: ({ searchParams }) => ({
      kind: "mfa",
      challenge: getSearchParam(searchParams, "challenge"),
      method: getSearchParam(searchParams, "method"),
      expiresAt: getSearchParam(searchParams, "expiresAt"),
    }),
    render: (route, props) =>
      props.renderMfa?.(route) ?? (
        <ManagerMfaScreen
          challenge={route.challenge}
          method={route.method}
          expiresAt={route.expiresAt}
        />
      ),
  }),
  defineManagerRoute({
    kind: "dashboard-home",
    path: "/",
    layout: "dashboard",
    parse: () => ({ kind: "dashboard-home" }),
    render: (route, props) =>
      props.renderDashboardHome?.(route) ?? <ManagerDashboardHomeScreen />,
  }),
  defineManagerRoute({
    kind: "account",
    path: "/account",
    layout: "dashboard",
    parse: () => ({ kind: "account" }),
    render: () => <ManagerAccountScreen />,
  }),
  defineManagerRoute({
    kind: "api-routes",
    path: "/api-routes",
    layout: "dashboard",
    parse: () => ({ kind: "api-routes" }),
    render: () => <ManagerApiRoutesScreen />,
  }),
  defineManagerRoute({
    kind: "media-library",
    path: "/media",
    layout: "dashboard",
    parse: () => ({ kind: "media-library" }),
    render: () => <ManagerMediaLibraryScreen />,
  }),
  defineManagerRoute({
    kind: "users",
    path: "/users",
    layout: "dashboard",
    parse: () => ({ kind: "users" }),
    render: () => <ManagerUsersScreen />,
  }),
  defineManagerRoute({
    kind: "settings-home",
    path: "/settings",
    layout: "dashboard",
    parse: () => ({ kind: "settings-home" }),
    render: (route, props) =>
      props.renderSettingsHome?.(route) ?? <ManagerSettingsHomeScreen />,
  }),
  defineManagerRoute({
    kind: "settings-system",
    path: "/settings/system",
    layout: "dashboard",
    parse: () => ({ kind: "settings-system" }),
    render: () => <ManagerSettingsSystemScreen />,
  }),
  defineManagerRoute({
    kind: "settings-languages",
    path: "/settings/languages",
    layout: "dashboard",
    parse: () => ({ kind: "settings-languages" }),
    render: () => <ManagerSettingsLanguagesScreen />,
  }),
  defineManagerRoute({
    kind: "settings-routes",
    path: "/settings/routes",
    layout: "dashboard",
    parse: () => ({ kind: "settings-routes" }),
    render: () => <ManagerSettingsRoutesScreen />,
  }),
  defineManagerRoute({
    kind: "settings-route-paths",
    path: "/settings/routes/paths",
    layout: "dashboard",
    parse: () => ({ kind: "settings-route-paths" }),
    render: () => <ManagerSettingsRoutePathsScreen />,
  }),
  defineManagerRoute({
    kind: "settings-user-roles",
    path: "/settings/user-roles",
    layout: "dashboard",
    parse: () => ({ kind: "settings-user-roles" }),
    render: () => <ManagerSettingsUserRolesScreen />,
  }),
  defineManagerRoute({
    kind: "settings-user-roles-create",
    path: "/settings/user-roles/create",
    layout: "dashboard",
    parse: () => ({ kind: "settings-user-roles-create" }),
    render: () => <ManagerSettingsUserRoleCreateScreen />,
  }),
  defineManagerRoute({
    kind: "settings-user-roles-edit",
    path: "/settings/user-roles/:id",
    layout: "dashboard",
    parse: ({ params }) => ({
      kind: "settings-user-roles-edit",
      id: params.id ?? "",
    }),
    render: (route) => <ManagerSettingsUserRoleEditScreen id={route.id} />,
  }),
  defineManagerRoute({
    kind: "settings-literals",
    path: "/settings/literals",
    layout: "dashboard",
    parse: () => ({ kind: "settings-literals" }),
    render: () => <ManagerSettingsLiteralsScreen />,
  }),
  defineManagerRoute({
    kind: "settings-redirects",
    path: "/settings/redirects",
    layout: "dashboard",
    parse: () => ({ kind: "settings-redirects" }),
    render: () => <ManagerSettingsRedirectsScreen />,
  }),
  defineManagerRoute({
    kind: "content-create",
    path: "/:contentType/create",
    layout: "dashboard",
    parse: ({ params }) => ({
      kind: "content-create",
      contentType: params.contentType ?? "",
    }),
    render: (route, props, contentType) =>
      props.renderContentCreate?.(route, contentType) ?? (
        <ManagerContentTypeCreateScreen contentType={contentType} />
      ),
  }),
  defineManagerRoute({
    kind: "content-edit",
    path: "/:contentType/:id",
    layout: "dashboard",
    parse: ({ params }) => ({
      kind: "content-edit",
      contentType: params.contentType ?? "",
      id: params.id ?? "",
    }),
    render: (route, props, contentType) =>
      props.renderContentEdit?.(route, contentType) ?? (
        <ManagerContentTypeEditScreen contentType={contentType} id={route.id} />
      ),
  }),
  defineManagerRoute({
    kind: "content-list",
    path: "/:contentType",
    layout: "dashboard",
    parse: ({ params }) => ({
      kind: "content-list",
      contentType: params.contentType ?? "",
    }),
    render: (route, _props, contentType) => (
      <ManagerContentTypeListScreen
        title={contentType?.name ?? route.contentType}
        contentType={route.contentType}
        fields={contentType?.listFields ?? []}
      />
    ),
  }),
] as const satisfies readonly AnyManagerRouteDefinition[];
