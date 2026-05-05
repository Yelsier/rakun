"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ManagerRoute =
  | {
      name: "content.list";
      contentType: string;
    }
  | {
      name: "content.create";
      contentType: string;
    }
  | {
      name: "content.edit";
      contentType: string;
      id: string;
    }
  | {
      name: "login";
    };

export type ManagerNavigation = {
  href: (route: ManagerRoute) => string;
  hrefPath?: (href: string) => string;
  pushPath?: (href: string) => void;
  replacePath?: (href: string) => void;
  push?: (route: ManagerRoute) => void;
  replace?: (route: ManagerRoute) => void;
};

export const DEFAULT_MANAGER_BASE_PATH = "";

const ManagerNavigationContext = createContext<ManagerNavigation | null>(null);

export const normalizeManagerBasePath = (
  basePath = DEFAULT_MANAGER_BASE_PATH,
) => {
  const normalized = `/${basePath.replace(/^\/+|\/+$/g, "")}`;
  return normalized === "/" ? "" : normalized;
};

const normalizeManagerPath = (path: string) => {
  const [pathname = "", search = ""] = path.split("?");
  const normalizedPathname = `/${pathname.replace(/^\/+|\/+$/g, "")}`;
  const normalized = normalizedPathname === "/" ? "/" : normalizedPathname;
  return search ? `${normalized}?${search}` : normalized;
};

export const getManagerPathHref = (
  href: string,
  options: {
    basePath?: string;
  } = {},
) => {
  if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)) {
    return href;
  }

  const basePath = normalizeManagerBasePath(options.basePath);
  const path = normalizeManagerPath(href);

  if (!basePath) {
    return path;
  }

  if (path === basePath || path.startsWith(`${basePath}/`)) {
    return path;
  }

  return path === "/" ? basePath : `${basePath}${path}`;
};

export const getManagerRelativePathname = (
  pathname: string,
  options: {
    basePath?: string;
  } = {},
) => {
  const basePath = normalizeManagerBasePath(options.basePath);
  const path = normalizeManagerPath(pathname).split("?")[0] ?? "/";

  if (!basePath) {
    return path;
  }

  if (path === basePath) {
    return "/";
  }

  if (path.startsWith(`${basePath}/`)) {
    return path.slice(basePath.length) || "/";
  }

  return path;
};

export const getManagerRouteHref = (
  route: ManagerRoute,
  options: {
    basePath?: string;
  } = {},
) => {
  if (route.name === "login") {
    return getManagerPathHref("/login", options);
  }

  const contentType = encodeURIComponent(route.contentType);

  if (route.name === "content.list") {
    return getManagerPathHref(`/${contentType}`, options);
  }

  if (route.name === "content.create") {
    return getManagerPathHref(`/${contentType}/create`, options);
  }

  return getManagerPathHref(
    `/${contentType}/${encodeURIComponent(route.id)}`,
    options,
  );
};

export const createPathManagerNavigation = (
  options: {
    basePath?: string;
    push?: (href: string) => void;
    replace?: (href: string) => void;
  } = {},
): ManagerNavigation => ({
  href: (route) => getManagerRouteHref(route, options),
  hrefPath: (href) => getManagerPathHref(href, options),
  pushPath: options.push
    ? (href) => {
        options.push?.(getManagerPathHref(href, options));
      }
    : undefined,
  replacePath: options.replace
    ? (href) => {
        options.replace?.(getManagerPathHref(href, options));
      }
    : undefined,
  push: options.push
    ? (route) => {
        options.push?.(getManagerRouteHref(route, options));
      }
    : undefined,
  replace: options.replace
    ? (route) => {
        options.replace?.(getManagerRouteHref(route, options));
      }
    : undefined,
});

export type ManagerNavigationProviderProps = {
  navigation: ManagerNavigation;
  children: ReactNode;
};

export const ManagerNavigationProvider = ({
  navigation,
  children,
}: ManagerNavigationProviderProps) => {
  return (
    <ManagerNavigationContext.Provider value={navigation}>
      {children}
    </ManagerNavigationContext.Provider>
  );
};

export const useManagerNavigation = () => {
  const navigation = useContext(ManagerNavigationContext);

  if (!navigation) {
    throw new Error(
      "useManagerNavigation must be used inside <ManagerNavigationProvider>.",
    );
  }

  return navigation;
};

export const useOptionalManagerNavigation = () =>
  useContext(ManagerNavigationContext);
