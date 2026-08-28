import {
  lazy as reactLazy,
  type ComponentType,
  type LazyExoticComponent,
} from "react";

import LanguageSelector from "../../components/LanguageSelector";
import { VariantSelector } from "../../components/VariantSelector";
import { CollaborationPresence } from '../../components/CollaborationPresence'

import {
  defineManagerRoute,
  getSearchParam,
  matchRoutePath,
  type AnyManagerRouteDefinition,
} from "./route-schema";
import type { ManagerResolvedRouteKind } from './types'
import { getManagerRelativePathname } from '../../state/navigation'

type PreloadableComponent<T extends ComponentType<any>> = LazyExoticComponent<T> & {
  preload: () => Promise<{ default: T }>
}

const lazy = <T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
): PreloadableComponent<T> => {
  let promise: Promise<{ default: T }> | undefined
  const preload = () => {
    promise ??= load()
    return promise
  }

  return Object.assign(reactLazy(preload), { preload }) as PreloadableComponent<T>
}

const ManagerAccountScreen = lazy(() =>
  import("../dashboard/account").then((module) => ({
    default: module.ManagerAccountScreen,
  })),
);
const ManagerApiRoutesScreen = lazy(() =>
  import("../dashboard/debugging/api-routes").then((module) => ({
    default: module.ManagerApiRoutesScreen,
  })),
);
const ManagerDebuggingHomeScreen = lazy(() =>
  import("../dashboard/debugging").then((module) => ({
    default: module.ManagerDebuggingHomeScreen,
  })),
);
const ManagerSettingsSecurityScreen = lazy(() =>
  import("../dashboard/debugging/security").then((module) => ({
    default: module.ManagerSettingsSecurityScreen,
  })),
);
const ManagerSettingsLogsScreen = lazy(() =>
  import("../dashboard/debugging/logs").then((module) => ({
    default: module.ManagerSettingsLogsScreen,
  })),
);
const ManagerContentTypeListScreen = lazy(() =>
  import("../dashboard/[contentType]/(list)").then((module) => ({
    default: module.ManagerContentTypeListScreen,
  })),
);
const ManagerContentTypeEditScreen = lazy(() =>
  import("../dashboard/[contentType]/[edit]").then((module) => ({
    default: module.ManagerContentTypeEditScreen,
  })),
);
const ManagerContentTypeCreateScreen = lazy(() =>
  import("../dashboard/[contentType]/create").then((module) => ({
    default: module.ManagerContentTypeCreateScreen,
  })),
);
const ManagerDashboardHomeScreen = lazy(() =>
  import("../dashboard").then((module) => ({
    default: module.ManagerDashboardHomeScreen,
  })),
);
const ManagerLoginScreen = lazy(() =>
  import("../login/screen").then((module) => ({
    default: module.ManagerLoginScreen,
  })),
);
const ManagerLoginCallbackScreen = lazy(() =>
  import("../login/callback").then((module) => ({
    default: module.ManagerLoginCallbackScreen,
  })),
);
const ManagerMediaLibraryScreen = lazy(() =>
  import("../dashboard/media").then((module) => ({
    default: module.ManagerMediaLibraryScreen,
  })),
);
const ManagerSeoScreen = lazy(() =>
  import('../dashboard/seo').then((module) => ({
    default: module.ManagerSeoScreen,
  })),
)
const ManagerMfaScreen = lazy(() =>
  import("../mfa").then((module) => ({
    default: module.ManagerMfaScreen,
  })),
);
const ManagerForgotPasswordScreen = lazy(() =>
  import("../password-recovery").then((module) => ({
    default: module.ManagerForgotPasswordScreen,
  })),
);
const ManagerResetPasswordScreen = lazy(() =>
  import("../password-recovery").then((module) => ({
    default: module.ManagerResetPasswordScreen,
  })),
);
const ManagerSettingsLanguagesScreen = lazy(() =>
  import("../dashboard/settings/languages").then((module) => ({
    default: module.ManagerSettingsLanguagesScreen,
  })),
);
const ManagerSettingsLiteralsScreen = lazy(() =>
  import("../dashboard/settings/literals").then((module) => ({
    default: module.ManagerSettingsLiteralsScreen,
  })),
);
const ManagerSettingsRedirectsScreen = lazy(() =>
  import("../dashboard/settings/redirects").then((module) => ({
    default: module.ManagerSettingsRedirectsScreen,
  })),
);
const ManagerSettingsRobotsScreen = lazy(() =>
  import("../dashboard/settings/robots").then((module) => ({
    default: module.ManagerSettingsRobotsScreen,
  })),
);
const ManagerSettingsSeoScreen = lazy(() =>
  import("../dashboard/settings/seo").then((module) => ({
    default: module.ManagerSettingsSeoScreen,
  })),
);
const ManagerSettingsLlmsScreen = lazy(() =>
  import("../dashboard/settings/llms").then((module) => ({
    default: module.ManagerSettingsLlmsScreen,
  })),
);
const ManagerSettingsRoutePathsScreen = lazy(() =>
  import("../dashboard/settings/routes/paths").then((module) => ({
    default: module.ManagerSettingsRoutePathsScreen,
  })),
);
const ManagerSettingsRoutesScreen = lazy(() =>
  import("../dashboard/settings/routes").then((module) => ({
    default: module.ManagerSettingsRoutesScreen,
  })),
);
const ManagerSettingsHomeScreen = lazy(() =>
  import("../dashboard/settings").then((module) => ({
    default: module.ManagerSettingsHomeScreen,
  })),
);
const ManagerSettingsSystemScreen = lazy(() =>
  import("../dashboard/settings/system").then((module) => ({
    default: module.ManagerSettingsSystemScreen,
  })),
);
const ManagerSettingsReviewPoliciesScreen = lazy(() =>
  import("../dashboard/settings/review-policies").then((module) => ({
    default: module.ManagerSettingsReviewPoliciesScreen,
  })),
);
const ManagerSettingsUserRolesScreen = lazy(() =>
  import("../dashboard/settings/user-roles/screen").then((module) => ({
    default: module.ManagerSettingsUserRolesScreen,
  })),
);
const ManagerSettingsUserRoleCreateScreen = lazy(() =>
  import("../dashboard/settings/user-roles/create/screen").then((module) => ({
    default: module.ManagerSettingsUserRoleCreateScreen,
  })),
);
const ManagerSettingsUserRoleEditScreen = lazy(() =>
  import("../dashboard/settings/user-roles/[edit]/screen").then((module) => ({
    default: module.ManagerSettingsUserRoleEditScreen,
  })),
);
const ManagerUsersScreen = lazy(() =>
  import("../dashboard/users").then((module) => ({
    default: module.ManagerUsersScreen,
  })),
);

export const managerRouteDefinitions = [
  defineManagerRoute({
    kind: "login",
    path: "/login",
    layout: "auth",
    parse: () => ({ kind: "login" }),
    render: (_route, props) =>
      props.renderLogin?.() ?? (
        <ManagerLoginScreen
          login={props.login}
          passwordRecoveryEnabled={props.passwordRecoveryEnabled}
        />
      ),
  }),
  defineManagerRoute({
    kind: "login-callback",
    path: "/login/callback",
    layout: "auth",
    parse: ({ searchParams }) => {
      const state = getSearchParam(searchParams, "state");
      return {
        kind: "login-callback",
        provider:
          getSearchParam(searchParams, "provider") ?? state?.split(".")[0],
        code: getSearchParam(searchParams, "code"),
        state,
        error: getSearchParam(searchParams, "error"),
      };
    },
    render: (route, props) =>
      props.renderLoginCallback?.(route) ?? (
        <ManagerLoginCallbackScreen {...route} />
      ),
  }),
  defineManagerRoute({
    kind: "forgot-password",
    path: "/forgot-password",
    layout: "auth",
    parse: () => ({ kind: "forgot-password" }),
    render: (_route, props) =>
      props.renderForgotPassword?.() ?? <ManagerForgotPasswordScreen />,
  }),
  defineManagerRoute({
    kind: "reset-password",
    path: "/reset-password",
    layout: "auth",
    parse: ({ searchParams }) => ({
      kind: "reset-password",
      token: getSearchParam(searchParams, "token"),
    }),
    render: (route, props) =>
      props.renderResetPassword?.(route) ?? (
        <ManagerResetPasswordScreen token={route.token} />
      ),
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
    kind: "debugging-home",
    path: "/debugging",
    layout: "dashboard",
    parse: () => ({ kind: "debugging-home" }),
    render: () => <ManagerDebuggingHomeScreen />,
  }),
  defineManagerRoute({
    kind: "api-routes",
    path: "/debugging/api-routes",
    layout: "dashboard",
    parse: () => ({ kind: "api-routes" }),
    render: () => <ManagerApiRoutesScreen />,
  }),
  // Legacy alias for bookmarks
  defineManagerRoute({
    kind: "api-routes",
    path: "/api-routes",
    layout: "dashboard",
    parse: () => ({ kind: "api-routes" }),
    render: () => <ManagerApiRoutesScreen />,
  }),
  defineManagerRoute({
    kind: "debugging-logs",
    path: "/debugging/logs",
    layout: "dashboard",
    parse: () => ({ kind: "debugging-logs" }),
    render: () => <ManagerSettingsLogsScreen />,
  }),
  // Legacy alias for bookmarks
  defineManagerRoute({
    kind: "debugging-logs",
    path: "/settings/logs",
    layout: "dashboard",
    parse: () => ({ kind: "debugging-logs" }),
    render: () => <ManagerSettingsLogsScreen />,
  }),
  defineManagerRoute({
    kind: "debugging-security",
    path: "/debugging/security",
    layout: "dashboard",
    parse: () => ({ kind: "debugging-security" }),
    render: () => <ManagerSettingsSecurityScreen />,
  }),
  // Legacy alias for bookmarks
  defineManagerRoute({
    kind: "debugging-security",
    path: "/settings/security",
    layout: "dashboard",
    parse: () => ({ kind: "debugging-security" }),
    render: () => <ManagerSettingsSecurityScreen />,
  }),
  defineManagerRoute({
    kind: 'seo',
    path: '/seo',
    layout: 'dashboard',
    parse: () => ({ kind: 'seo' }),
    render: (_route, props) => (
      <ManagerSeoScreen
        contentTypes={props.contentTypes ?? []}
        siteUrl={props.siteUrl}
      />
    ),
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
    kind: "settings-review-policies",
    path: "/settings/review-policies",
    layout: "dashboard",
    parse: () => ({ kind: "settings-review-policies" }),
    render: () => <ManagerSettingsReviewPoliciesScreen />,
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
    kind: "settings-robots",
    path: "/settings/robots",
    layout: "dashboard",
    parse: () => ({ kind: "settings-robots" }),
    render: () => <ManagerSettingsRobotsScreen />,
  }),
  defineManagerRoute({
    kind: "settings-seo",
    path: "/settings/seo",
    layout: "dashboard",
    parse: () => ({ kind: "settings-seo" }),
    render: () => <ManagerSettingsSeoScreen />,
  }),
  defineManagerRoute({
    kind: "settings-llms",
    path: "/settings/llms",
    layout: "dashboard",
    parse: () => ({ kind: "settings-llms" }),
    render: () => <ManagerSettingsLlmsScreen />,
  }),
  defineManagerRoute({
    kind: "content-create",
    path: "/:contentType/create",
    layout: "dashboard",
    parse: ({ params }) => ({
      kind: "content-create",
      contentType: params.contentType ?? "",
    }),
    headerEnd: () => <LanguageSelector className="w-36 border-0 shadow-none" />,
    render: (route, props, contentType) =>
      props.renderContentCreate?.(route, contentType) ?? (
        <ManagerContentTypeCreateScreen
          contentType={contentType}
          preview={props.preview}
        />
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
    headerEnd: (route, _props, contentType) => (
      <div className="flex items-center gap-2">
        <CollaborationPresence
          contentType={route.contentType}
          documentId={route.id}
        />
        <VariantSelector
          contentType={route.contentType}
          documentId={route.id}
          routeKey={contentType?.routes?.find((item) => item.hasPage)?.key}
        />
        <LanguageSelector className="w-36 border-0 shadow-none" />
      </div>
    ),
    render: (route, props, contentType) =>
      props.renderContentEdit?.(route, contentType) ?? (
        <ManagerContentTypeEditScreen
          contentType={contentType}
          id={route.id}
          preview={props.preview}
          siteUrl={props.siteUrl}
        />
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
    headerEnd: () => <LanguageSelector className="w-36 border-0 shadow-none" />,
    render: (route, _props, contentType) => (
      <ManagerContentTypeListScreen
        title={contentType?.name ?? route.contentType}
        contentType={route.contentType}
        fields={contentType?.listFields ?? []}
        documentVisibility={contentType?.documentVisibility}
        hasPageRoutes={contentType?.routes?.some((item) => item.hasPage)}
      />
    ),
  }),
] as const satisfies readonly AnyManagerRouteDefinition[];

const managerRoutePreloads: Partial<
  Record<ManagerResolvedRouteKind, () => Promise<unknown>>
> = {
  login: ManagerLoginScreen.preload,
  'login-callback': ManagerLoginCallbackScreen.preload,
  'forgot-password': ManagerForgotPasswordScreen.preload,
  'reset-password': ManagerResetPasswordScreen.preload,
  mfa: ManagerMfaScreen.preload,
  'dashboard-home': ManagerDashboardHomeScreen.preload,
  account: ManagerAccountScreen.preload,
  'debugging-home': ManagerDebuggingHomeScreen.preload,
  'api-routes': ManagerApiRoutesScreen.preload,
  'debugging-logs': ManagerSettingsLogsScreen.preload,
  'debugging-security': ManagerSettingsSecurityScreen.preload,
  seo: ManagerSeoScreen.preload,
  'media-library': ManagerMediaLibraryScreen.preload,
  users: ManagerUsersScreen.preload,
  'settings-home': ManagerSettingsHomeScreen.preload,
  'settings-system': ManagerSettingsSystemScreen.preload,
  'settings-review-policies': ManagerSettingsReviewPoliciesScreen.preload,
  'settings-languages': ManagerSettingsLanguagesScreen.preload,
  'settings-routes': ManagerSettingsRoutesScreen.preload,
  'settings-route-paths': ManagerSettingsRoutePathsScreen.preload,
  'settings-user-roles': ManagerSettingsUserRolesScreen.preload,
  'settings-user-roles-create': ManagerSettingsUserRoleCreateScreen.preload,
  'settings-user-roles-edit': ManagerSettingsUserRoleEditScreen.preload,
  'settings-literals': ManagerSettingsLiteralsScreen.preload,
  'settings-redirects': ManagerSettingsRedirectsScreen.preload,
  'settings-robots': ManagerSettingsRobotsScreen.preload,
  'settings-seo': ManagerSettingsSeoScreen.preload,
  'settings-llms': ManagerSettingsLlmsScreen.preload,
  'content-create': ManagerContentTypeCreateScreen.preload,
  'content-edit': ManagerContentTypeEditScreen.preload,
  'content-list': ManagerContentTypeListScreen.preload,
}

export const preloadManagerPath = (
  pathname: string,
  options: { basePath?: string } = {},
): void => {
  const managerPathname =
    getManagerRelativePathname(pathname, options).replace(/\/+$/, '') || '/'
  const definition = managerRouteDefinitions.find((item) =>
    matchRoutePath(item.path, managerPathname),
  )
  const preload = definition ? managerRoutePreloads[definition.kind] : undefined
  if (preload) void preload()
}
