import { QueryClientProvider } from "@tanstack/react-query";
import type { EncodedContentType } from "@rakun-kit/core/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import { ManagerUsersProvider } from "@/state/users";
import { ManagerRootProviders } from "@/app/root-providers";
import { ManagerLoadingFallback } from "@/components/manager-loading-fallback";
import { ManagerLinkProvider, type ManagerLinkComponent } from "@/link";
import {
  ManagerRuntimeAuthProvider,
  type ManagerRuntimeAuthValue,
} from "@/app/runtime-auth";
import { renderDefaultManagerMediaPicker } from "@/app/media-picker";
import {
  ManagerMediaProvider,
  type ManagerMediaPickerRenderArgs,
} from "@/media";
import type { ManagerAppOverrides } from "../router";
import type { ManagerPreviewConfig } from "../router";
import type { RakunManagerPluginDefinition } from '../plugins'
import {
  ManagerI18nProvider,
  useTranslations,
  type ManagerLocaleInputPack,
} from '@/i18n'


const BootstrapFailedMessage = ({ message }: { message: string }) => {
  const t = useTranslations()
  return (
    <div className="p-6">
      {t("common.bootstrapFailed")} {message}
    </div>
  )
}

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
  plugins?: readonly RakunManagerPluginDefinition[];
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
  plugins,
}: ManagerRuntimeAppProps) => {
  const queryClient = useMemo(() => createManagerQueryClient(), []);
  const [localePacks, setLocalePacks] = useState<ManagerLocaleInputPack[]>([]);
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
  const bootstrapRunRef = useRef(0);

  useEffect(() => {
    let cancelled = false

    void client
      .request('manager.uiLocales')
      .then((result) => {
        if (cancelled) return
        const locales = (result as { locales?: ManagerLocaleInputPack[] }).locales
        setLocalePacks(Array.isArray(locales) ? locales : [])
      })
      .catch(() => {
        if (cancelled) return
        setLocalePacks([])
      })

    return () => {
      cancelled = true
    }
  }, [client])

  const bootstrap = useCallback(async (): Promise<boolean> => {
    const run = bootstrapRunRef.current + 1;
    bootstrapRunRef.current = run;
    const isCurrentRun = () => bootstrapRunRef.current === run;

    try {
      const next = await loadManagerBootstrap(client);

      if (!isCurrentRun()) {
        return false;
      }

      if (!next.user || !next.initialLanguage) {
        setState({ status: "unauthenticated" });
        return false;
      }

      const contentTypes = (await client.request(
        "manager.contentTypes",
      )) as EncodedContentType[];

      if (!isCurrentRun()) {
        return false;
      }

      setState({
        status: "ready",
        user: next.user,
        languages: next.languages,
        initialLanguage: next.initialLanguage,
        contentTypes,
      });

      return true;
    } catch (error) {
      if (!isCurrentRun()) {
        return false;
      }

      throw error;
    }
  }, [client]);

  const refreshAuth = useCallback(async () => {
    try {
      return await bootstrap();
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }, [bootstrap]);

  const runtimeAuth = useMemo<ManagerRuntimeAuthValue>(
    () => ({
      refreshAuth,
    }),
    [refreshAuth],
  );

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }

    const refreshContentTypes = () => {
      void client
        .request("manager.contentTypes")
        .then((contentTypes) => {
          setState((current) =>
            current.status === "ready"
              ? {
                  ...current,
                  contentTypes: contentTypes as EncodedContentType[],
                }
              : current,
          );
        })
        .catch(() => {
          // Keep the last known schema if the refresh fails.
        });
    };

    const onFocus = () => {
      refreshContentTypes();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [client, state.status]);

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
      <ManagerI18nProvider localePacks={localePacks}>
        <QueryClientProvider client={queryClient}>
          <ManagerProvider client={client}>
            <ManagerRuntimeAuthProvider value={runtimeAuth}>
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
                          <BootstrapFailedMessage message={state.message} />
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
                            plugins={plugins}
                            {...overrides}
                          />
                        )}
                      </>
                    ) : null}

                    {state.status === "ready" ? (
                      <SessionProvider
                        initialUser={state.user}
                        contentTypes={state.contentTypes}
                      >
                        <ManagerUsersProvider>
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
                              plugins={plugins}
                              {...overrides}
                            />
                          </LanguageProvider>
                        </ManagerUsersProvider>
                      </SessionProvider>
                    ) : null}
                  </ManagerMediaProvider>
                </ManagerLinkProvider>
              </ManagerNavigationProvider>
            </ManagerRuntimeAuthProvider>
          </ManagerProvider>
        </QueryClientProvider>
      </ManagerI18nProvider>
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
