import { useEffect } from "react";

import { resolveManagerPath } from "./shared/resolve-path";
import { ManagerRouteRenderer } from "./shared/route-renderer";
import type { ManagerAppProps, ManagerResolvedRoute } from "./shared/types";
import {
  getManagerRelativePathname,
  useManagerNavigation,
} from "../state/navigation";

const isAuthRoute = (route: ManagerResolvedRoute) =>
  route.kind === "login" || route.kind === "mfa";

export const ManagerApp = ({
  pathname,
  basePath,
  searchParams,
  authenticated,
  ...props
}: ManagerAppProps) => {
  const navigation = useManagerNavigation();
  const route = resolveManagerPath({ pathname, basePath, searchParams });
  const managerPathname = getManagerRelativePathname(pathname, { basePath });
  const shouldRedirectToLogin = !authenticated && !isAuthRoute(route);

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
        {...props}
      />
    );
  }

  return (
    <ManagerRouteRenderer
      route={route}
      pathname={managerPathname}
      basePath={basePath}
      {...props}
    />
  );
};
