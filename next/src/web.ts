import { headers as nextHeaders } from "next/headers";
import type { PageOutput } from "@rakun-kit/core/contracts";

export type RakunNextPageSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type RakunNextPageParams = Record<
  string,
  string | string[] | undefined
>;

export type RakunNextFetchOptions = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export type GetRakunPageOptions = {
  path: string;
  apiBaseUrl?: string | URL;
  search?: string | URLSearchParams | RakunNextPageSearchParams;
  headers?: HeadersInit;
  forwardHeaders?: boolean;
  fetchOptions?: RakunNextFetchOptions;
  fetch?: typeof globalThis.fetch;
};

export type GetRakunPathFromParamsOptions = {
  params: RakunNextPageParams;
  paramKey?: string;
  basePath?: string;
};

const defaultApiBaseUrl = "/api/rakun";
const defaultParamKey = "slug";

const blockedForwardHeaders = new Set([
  "connection",
  "content-length",
  "host",
  "transfer-encoding",
]);

const normalizePath = (path: string): string => {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
};

const normalizeBasePath = (path: string): string =>
  path === "/" ? "" : path.replace(/^\/+|\/+$/g, "");

const searchToString = (
  search: GetRakunPageOptions["search"],
): string | undefined => {
  if (!search) return undefined;

  if (typeof search === "string") {
    return search.startsWith("?") ? search : `?${search}`;
  }

  const searchParams =
    search instanceof URLSearchParams ? search : new URLSearchParams();

  if (!(search instanceof URLSearchParams)) {
    for (const [key, value] of Object.entries(search)) {
      if (typeof value === "undefined") continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(key, item);
        }
        continue;
      }

      searchParams.set(key, value);
    }
  }

  const value = searchParams.toString();
  return value ? `?${value}` : undefined;
};

const getRequestOrigin = async (): Promise<string> => {
  const requestHeaders = await nextHeaders();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    throw new Error(
      "Cannot resolve relative Rakun API URL without a request host. Pass an absolute apiBaseUrl.",
    );
  }

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
};

const resolveApiBaseUrl = async (apiBaseUrl: string | URL): Promise<URL> => {
  if (apiBaseUrl instanceof URL) return apiBaseUrl;

  try {
    return new URL(apiBaseUrl);
  } catch {
    return new URL(apiBaseUrl, await getRequestOrigin());
  }
};

const createForwardHeaders = async (): Promise<Headers> => {
  const output = new Headers();
  const requestHeaders = await nextHeaders();

  for (const [name, value] of requestHeaders.entries()) {
    if (blockedForwardHeaders.has(name.toLowerCase())) continue;
    output.set(name, value);
  }

  return output;
};

const createRequestHeaders = async ({
  headers,
  forwardHeaders,
}: Pick<GetRakunPageOptions, "headers" | "forwardHeaders">) => {
  const output = forwardHeaders === false ? new Headers() : await createForwardHeaders();

  if (headers) {
    for (const [name, value] of new Headers(headers).entries()) {
      output.set(name, value);
    }
  }

  return output;
};

export const getRakunPathFromParams = ({
  params,
  paramKey = defaultParamKey,
  basePath = "",
}: GetRakunPathFromParamsOptions): string => {
  const rawValue = params[paramKey] ?? Object.values(params).find(Boolean);
  const segments = Array.isArray(rawValue)
    ? rawValue
    : typeof rawValue === "string"
      ? [rawValue]
      : [];
  const normalizedBasePath = normalizeBasePath(basePath);
  const pathSegments = [
    ...(normalizedBasePath ? [normalizedBasePath] : []),
    ...segments.filter(Boolean),
  ];

  return normalizePath(pathSegments.join("/"));
};

export const getRakunPage = async ({
  path,
  apiBaseUrl = defaultApiBaseUrl,
  search,
  headers,
  forwardHeaders = true,
  fetchOptions,
  fetch: fetchFn = globalThis.fetch,
}: GetRakunPageOptions): Promise<PageOutput> => {
  const baseUrl = await resolveApiBaseUrl(apiBaseUrl);
  const url = new URL(`${baseUrl.pathname.replace(/\/$/, "")}/web/page`, baseUrl);

  url.searchParams.set("path", normalizePath(path));

  const searchValue = searchToString(search);
  if (searchValue) {
    url.searchParams.set("search", searchValue);
  }

  const response = await fetchFn(url, {
    cache: "no-store",
    ...fetchOptions,
    method: "GET",
    headers: await createRequestHeaders({
      headers,
      forwardHeaders,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Rakun page request failed with ${response.status}: ${text.slice(0, 200)}`,
    );
  }

  return (await response.json()) as PageOutput;
};
