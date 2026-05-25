import { QueryClientProvider } from "@tanstack/react-query";
import type { EncodedContentType } from "@rakun-kit/core/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { createManagerQueryClient } from "@/app/app-provider";
import { loadManagerBootstrap } from "@/app/bootstrap";
import {
  createPathManagerNavigation,
  getManagerPathHref,
  ManagerNavigationProvider,
} from "../state/navigation";
import type { ManagerNavigation } from "../state/navigation";
import { ManagerProvider } from "../client/react";
import type { ManagerProviderProps } from "../client/react";
import { ManagerApp } from "../router";
import { SessionProvider } from "@/state/session";
import { LanguageProvider } from "@/state/language";
import { ManagerRootProviders } from "@/app/root-providers";
import { ManagerLoadingFallback } from "@/components/manager-loading-fallback";
import { ManagerLinkProvider, type ManagerLinkComponent } from "@/link";
import { renderDefaultManagerMediaPicker } from "@/app/media-picker";
import {
  ManagerMediaProvider,
  type ManagerMediaPickerRenderArgs,
} from "@/media";
import type { ManagerAppOverrides } from "../router";
import type { ManagerPreviewConfig } from "../router";

type BootstrapState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "unauthenticated" }
  | {
      status: "ready";
      user: NonNullable<
        Awaited<ReturnType<typeof loadManagerBootstrap>>["user"]
      >;
      languages: Awaited<ReturnType<typeof loadManagerBootstrap>>["languages"];
      initialLanguage: NonNullable<
        Awaited<ReturnType<typeof loadManagerBootstrap>>["initialLanguage"]
      >;
      contentTypes: EncodedContentType[];
    };

export type ManagerRuntimeAppProps = {
  client: ManagerProviderProps["client"];
  navigation: ManagerNavigation;
  pathname: string;
  basePath?: string;
  searchParams?:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | undefined;
  loadingFallback?: ReactNode;
  unauthenticatedFallback?: ReactNode;
  errorFallback?: (message: string) => ReactNode;
  overrides?: ManagerAppOverrides;
  preview?: ManagerPreviewConfig;
  linkComponent?: ManagerLinkComponent;
  renderMediaPicker?: (args: ManagerMediaPickerRenderArgs) => ReactNode;
};

export type ManagerBrowserAppProps = Omit<
  ManagerRuntimeAppProps,
  "navigation"
> & {
  navigation?: ManagerNavigation;
  overrides?: ManagerAppOverrides;
};

export const ManagerRuntimeApp = ({
  client,
  navigation,
  pathname,
  basePath,
  searchParams,
  loadingFallback,
  unauthenticatedFallback,
  errorFallback,
  overrides,
  preview,
  linkComponent,
  renderMediaPicker,
}: ManagerRuntimeAppProps) => {
  const queryClient = useMemo(() => createManagerQueryClient(), []);
  const scopedNavigation = useMemo<ManagerNavigation>(
    () => ({
      ...navigation,
      hrefPath: (href) => {
        const scopedHref = getManagerPathHref(href, { basePath });
        return navigation.hrefPath?.(scopedHref) ?? scopedHref;
      },
      pushPath: navigation.pushPath
        ? (href) => {
            navigation.pushPath?.(getManagerPathHref(href, { basePath }));
          }
        : undefined,
      replacePath: navigation.replacePath
        ? (href) => {
            navigation.replacePath?.(getManagerPathHref(href, { basePath }));
          }
        : undefined,
    }),
    [basePath, navigation],
  );
  const [state, setState] = useState<BootstrapState>({ status: "loading" });

  const bootstrap = useCallback(async () => {
    const next = await loadManagerBootstrap(client);

    if (!next.user || !next.initialLanguage) {
      setState({ status: "unauthenticated" });
      return;
    }

    const contentTypes = (await client.request(
      "manager.contentTypes",
    )) as EncodedContentType[];

    setState({
      status: "ready",
      user: next.user,
      languages: next.languages,
      initialLanguage: next.initialLanguage,
      contentTypes,
    });
  }, [client]);

  useEffect(() => {
    void bootstrap().catch((error) => {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    });
  }, [bootstrap]);

  useEffect(() => {
    if (state.status !== "unauthenticated") {
      return;
    }

    void bootstrap().catch(() => {
      // keep current state until auth succeeds
    });
  }, [bootstrap, pathname, searchParams, state.status]);

  return (
    <ManagerRootProviders>
      <QueryClientProvider client={queryClient}>
        <ManagerProvider client={client}>
          <ManagerNavigationProvider navigation={scopedNavigation}>
            <ManagerLinkProvider component={linkComponent}>
              <ManagerMediaProvider
                renderPicker={
                  renderMediaPicker ?? renderDefaultManagerMediaPicker
                }
              >
                {state.status === "loading" ? (
                  <>{loadingFallback ?? <ManagerLoadingFallback />}</>
                ) : null}

                {state.status === "error" ? (
                  <>
                    {errorFallback?.(state.message) ?? (
                      <div className="p-6">
                        Bootstrap failed: {state.message}
                      </div>
                    )}
                  </>
                ) : null}

                {state.status === "unauthenticated" ? (
                  <>
                    {unauthenticatedFallback ?? (
                      <ManagerApp
                        pathname={pathname}
                        basePath={basePath}
                        searchParams={searchParams}
                        preview={preview}
                        {...overrides}
                      />
                    )}
                  </>
                ) : null}

                {state.status === "ready" ? (
                  <SessionProvider initialUser={state.user}>
                    <LanguageProvider
                      languages={state.languages}
                      initialLanguage={state.initialLanguage}
                    >
                      <ManagerApp
                        pathname={pathname}
                        basePath={basePath}
                        searchParams={searchParams}
                        contentTypes={state.contentTypes}
                        authenticated
                        preview={preview}
                        {...overrides}
                      />
                    </LanguageProvider>
                  </SessionProvider>
                ) : null}
              </ManagerMediaProvider>
            </ManagerLinkProvider>
          </ManagerNavigationProvider>
        </ManagerProvider>
      </QueryClientProvider>
    </ManagerRootProviders>
  );
};

export const ManagerBrowserApp = (props: ManagerBrowserAppProps) => {
  const { basePath, navigation: providedNavigation, ...runtimeProps } = props;
  const browserNavigation = useMemo(
    () =>
      createPathManagerNavigation({
        basePath,
        push: (href) => {
          window.history.pushState({}, "", href);
          window.dispatchEvent(new PopStateEvent("popstate"));
        },
        replace: (href) => {
          window.history.replaceState({}, "", href);
          window.dispatchEvent(new PopStateEvent("popstate"));
        },
      }),
    [basePath],
  );
  const navigation = providedNavigation ?? browserNavigation;

  return (
    <ManagerRuntimeApp
      {...runtimeProps}
      basePath={basePath}
      navigation={navigation}
    />
  );
};
