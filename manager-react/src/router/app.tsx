import { useEffect } from "react";

import { resolveManagerPath } from "./shared/resolve-path";
import { ManagerRouteRenderer } from "./shared/route-renderer";
import type { ManagerAppProps, ManagerResolvedRoute } from "./shared/types";
import {
  getManagerRelativePathname,
  useManagerNavigation,
} from "../state/navigation";
import {
  ManagerPluginProvider,
  useManagerPlugins,
} from '../plugins'

const isAuthRoute = (route: ManagerResolvedRoute) =>
  route.kind === "login" ||
  route.kind === 'forgot-password' ||
  route.kind === 'reset-password' ||
  route.kind === "mfa";

const ManagerAppContent = ({
  pathname,
  basePath,
  searchParams,
  authenticated,
  ...props
}: ManagerAppProps) => {
  const navigation = useManagerNavigation();
  const pluginRegistry = useManagerPlugins()
  const route = resolveManagerPath({
    pathname,
    basePath,
    searchParams,
    pluginRegistry,
    contentTypes: props.contentTypes,
  });
  const managerPathname = getManagerRelativePathname(pathname, { basePath });
  const passwordRecoveryUnavailable =
    !props.passwordRecoveryEnabled &&
    (route.kind === 'forgot-password' || route.kind === 'reset-password')
  const shouldRedirectToLogin =
    passwordRecoveryUnavailable || (!authenticated && !isAuthRoute(route));

  useEffect(() => {
    if (!shouldRedirectToLogin) return;

    navigation.replace?.({
      name: "login",
    });
  }, [navigation, shouldRedirectToLogin]);

  if (shouldRedirectToLogin) {
    return (
      <ManagerRouteRenderer
        route={{ kind: "login" }}
        pathname="/login"
        basePath={basePath}
        passwordRecoveryEnabled={props.passwordRecoveryEnabled}
        {...props}
        searchParams={searchParams}
      />
    );
  }

  return (
    <ManagerRouteRenderer
      route={route}
      pathname={managerPathname}
      basePath={basePath}
      {...props}
      searchParams={searchParams}
    />
  );
};

export const ManagerApp = ({ plugins, ...props }: ManagerAppProps) => (
  <ManagerPluginProvider plugins={plugins}>
    <ManagerAppContent {...props} plugins={plugins} />
  </ManagerPluginProvider>
)
