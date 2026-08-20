import { QueryClientProvider } from "@tanstack/react-query";
import type {
  EncodedContentType,
  LoginAdapterMetadata,
  RealtimeMetadata,
} from "@rakun-kit/core/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type ReactNode,
} from "react";

import { createManagerQueryClient } from "@/app/app-provider";
import { loadManagerBootstrap } from "@/app/bootstrap";
import {
  createPathManagerNavigation,
  getManagerPathHref,
  getManagerRelativePathname,
  ManagerNavigationProvider,
} from "../state/navigation";
import type { ManagerNavigation } from "../state/navigation";
import { ManagerProvider } from "../client/react";
import type { ManagerProviderProps } from "../client/react";
import { resolveRealtimeMetadata } from '../client/realtime'
import { ManagerApp } from "../router";
import { SessionProvider } from "@/state/session";
import { LanguageProvider } from "@/state/language";
import { ManagerUsersProvider } from "@/state/users";
import { ManagerRootProviders } from "@/app/root-providers";
import {
  ManagerAuthLoadingFallback,
  ManagerLoadingFallback,
} from "@/components/manager-loading-fallback";
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
import type { RakunManagerPluginDefinition } from "../plugins";
import {
  ManagerI18nProvider,
  useTranslations,
  type ManagerLocaleInputPack,
} from "@/i18n";
import { ConfirmProvider } from "@/components/confirm";

const BootstrapFailedMessage = ({ message }: { message: string }) => {
  const t = useTranslations();
  return (
    <div className="p-6">
      {t("common.bootstrapFailed")} {message}
    </div>
  );
};

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
  realtimeBaseUrl?: string;
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

const authLoadingPaths = new Set([
  "/forgot-password",
  "/login",
  "/login/callback",
  "/mfa",
  "/reset-password",
]);

export const ManagerRuntimeApp = ({
  client,
  realtimeBaseUrl,
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
  const [managerUiLoaded, setManagerUiLoaded] = useState(false);
  const [siteUrl, setSiteUrl] = useState<string>();
  const [passwordRecoveryEnabled, setPasswordRecoveryEnabled] = useState(false);
  const [realtime, setRealtime] = useState<RealtimeMetadata>({
    transport: 'polling',
    intervalMs: 3_000,
  })
  const [login, setLogin] = useState<{
    password: boolean;
    adapters: LoginAdapterMetadata[];
  }>({ password: true, adapters: [] });
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
  const managerPathname = getManagerRelativePathname(pathname, { basePath });
  const useAuthLoadingFallback = authLoadingPaths.has(
    managerPathname.replace(/\/+$/, "") || "/",
  );

  useEffect(() => {
    let cancelled = false;
    setManagerUiLoaded(false);

    void client
      .request("manager.uiLocales")
      .then((result) => {
        if (cancelled) return;
        const uiConfig = result as {
          locales?: ManagerLocaleInputPack[];
          siteUrl?: string;
          platform?: {
            realtime?: RealtimeMetadata;
          };
          features?: {
            passwordRecovery?: boolean;
            login?: {
              password?: boolean;
              adapters?: LoginAdapterMetadata[];
            };
          };
        };
        const locales = uiConfig.locales;
        setLocalePacks(Array.isArray(locales) ? locales : []);
        setSiteUrl(uiConfig.siteUrl);
        setRealtime(resolveRealtimeMetadata(
          uiConfig.platform?.realtime ?? {
            transport: 'polling',
            intervalMs: 3_000,
          },
          realtimeBaseUrl,
        ));
        setPasswordRecoveryEnabled(
          uiConfig.features?.passwordRecovery === true,
        );
        setLogin({
          password: uiConfig.features?.login?.password !== false,
          adapters: Array.isArray(uiConfig.features?.login?.adapters)
            ? uiConfig.features.login.adapters
            : [],
        });
        setManagerUiLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLocalePacks([]);
        setSiteUrl(undefined);
        setRealtime({ transport: 'polling', intervalMs: 3_000 });
        setPasswordRecoveryEnabled(false);
        setLogin({ password: true, adapters: [] });
        setManagerUiLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [client, realtimeBaseUrl]);

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

  const isLoading = state.status === "loading" || !managerUiLoaded;

  return (
    <ManagerRootProviders>
      <ManagerI18nProvider localePacks={localePacks}>
        <ConfirmProvider>
          <QueryClientProvider client={queryClient}>
            <ManagerProvider client={client} realtime={realtime}>
              <ManagerRuntimeAuthProvider value={runtimeAuth}>
                <ManagerNavigationProvider navigation={scopedNavigation}>
                  <ManagerLinkProvider component={linkComponent}>
                    <ManagerMediaProvider
                      renderPicker={
                        renderMediaPicker ?? renderDefaultManagerMediaPicker
                      }
                    >
                      {isLoading ? (
                        <>
                          {loadingFallback ??
                            (useAuthLoadingFallback ? (
                              <ManagerAuthLoadingFallback />
                            ) : (
                              <ManagerLoadingFallback />
                            ))}
                        </>
                      ) : null}

                      {!isLoading && state.status === "error" ? (
                        <>
                          {errorFallback?.(state.message) ?? (
                            <BootstrapFailedMessage message={state.message} />
                          )}
                        </>
                      ) : null}

                      {!isLoading && state.status === "unauthenticated" ? (
                        <>
                          {unauthenticatedFallback ?? (
                            <ManagerApp
                              pathname={pathname}
                              basePath={basePath}
                              searchParams={searchParams}
                              passwordRecoveryEnabled={passwordRecoveryEnabled}
                              login={login}
                              siteUrl={siteUrl}
                              preview={preview}
                              plugins={plugins}
                              {...overrides}
                            />
                          )}
                        </>
                      ) : null}

                      {!isLoading && state.status === "ready" ? (
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
                                passwordRecoveryEnabled={passwordRecoveryEnabled}
                                login={login}
                                siteUrl={siteUrl}
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
        </ConfirmProvider>
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
          startTransition(() => {
            window.dispatchEvent(new PopStateEvent("popstate"));
          });
        },
        replace: (href) => {
          window.history.replaceState({}, "", href);
          startTransition(() => {
            window.dispatchEvent(new PopStateEvent("popstate"));
          });
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
