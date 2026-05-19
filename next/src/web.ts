import { headers as nextHeaders } from "next/headers";
import type { MetadataRoute } from "next";
import type { PageOutput, SitemapOutput } from "@rakun-kit/core/contracts";

export {
  RakunPageRenderer,
  type RakunPageModuleImport,
  type RakunPageModuleLoader,
  type RakunPageRendererProps,
} from "./web-renderer";

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

export type GetRakunSitemapOptions = {
  apiBaseUrl?: string | URL;
  siteUrl?: string | URL;
  language?: string;
  headers?: HeadersInit;
  forwardHeaders?: boolean;
  fetchOptions?: RakunNextFetchOptions;
  fetch?: typeof globalThis.fetch;
};

export type RakunSitemapRouteHandlerContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

export type CreateRakunSitemapIndexRouteHandlerOptions = Omit<
  GetRakunSitemapOptions,
  "language"
> & {
  sitemapPath?: (language: string) => string;
};

export type CreateRakunLocaleSitemapRouteHandlerOptions =
  GetRakunSitemapOptions & {
    paramKey?: string;
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

const resolveSiteUrl = async (siteUrl?: string | URL): Promise<URL> => {
  if (siteUrl instanceof URL) return siteUrl;
  if (typeof siteUrl === "string") return new URL(siteUrl);
  return new URL(await getRequestOrigin());
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

export const getRakunSitemap = async ({
  apiBaseUrl = defaultApiBaseUrl,
  siteUrl,
  language,
  headers,
  forwardHeaders = true,
  fetchOptions,
  fetch: fetchFn = globalThis.fetch,
}: GetRakunSitemapOptions = {}): Promise<MetadataRoute.Sitemap> => {
  const [baseUrl, resolvedSiteUrl] = await Promise.all([
    resolveApiBaseUrl(apiBaseUrl),
    resolveSiteUrl(siteUrl),
  ]);
  const url = new URL(
    `${baseUrl.pathname.replace(/\/$/, "")}/web/sitemap`,
    baseUrl,
  );
  if (language) {
    url.searchParams.set("language", language);
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
      `Rakun sitemap request failed with ${response.status}: ${text.slice(0, 200)}`,
    );
  }

  const sitemap = (await response.json()) as SitemapOutput;

  return sitemap.items.map((item) => ({
    url: new URL(item.path, resolvedSiteUrl).toString(),
    lastModified: item.lastModified
      ? new Date(item.lastModified)
      : undefined,
  }));
};

export const getRakunSitemapLanguages = async ({
  apiBaseUrl = defaultApiBaseUrl,
  headers,
  forwardHeaders = true,
  fetchOptions,
  fetch: fetchFn = globalThis.fetch,
}: Omit<GetRakunSitemapOptions, "language" | "siteUrl"> = {}) => {
  const baseUrl = await resolveApiBaseUrl(apiBaseUrl);
  const url = new URL(
    `${baseUrl.pathname.replace(/\/$/, "")}/web/sitemap`,
    baseUrl,
  );

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
      `Rakun sitemap languages request failed with ${response.status}: ${text.slice(0, 200)}`,
    );
  }

  return ((await response.json()) as SitemapOutput).languages;
};

export const createRakunSitemapHandler =
  (options: GetRakunSitemapOptions = {}) =>
  async (): Promise<MetadataRoute.Sitemap> =>
    await getRakunSitemap(options);

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const createXmlResponse = (xml: string): Response =>
  new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });

const renderSitemapIndexXml = (
  entries: Array<{ url: string; lastModified?: string | Date }>,
): string => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <sitemap>
    <loc>${escapeXml(entry.url)}</loc>${
      entry.lastModified
        ? `
    <lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>`
        : ""
    }
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;

const renderSitemapXml = (entries: MetadataRoute.Sitemap): string => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>${
      entry.lastModified
        ? `
    <lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>`
        : ""
    }
  </url>`,
  )
  .join("\n")}
</urlset>`;

const getStringParam = (
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined => {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
};

export const createRakunSitemapIndexRouteHandler =
  ({
    siteUrl,
    sitemapPath = (language) => `/${language}/sitemap.xml`,
    ...options
  }: CreateRakunSitemapIndexRouteHandlerOptions = {}) =>
  async (): Promise<Response> => {
    const [languages, resolvedSiteUrl] = await Promise.all([
      getRakunSitemapLanguages(options),
      resolveSiteUrl(siteUrl),
    ]);

    return createXmlResponse(
      renderSitemapIndexXml(
        languages.map((language) => ({
          url: new URL(sitemapPath(language.code), resolvedSiteUrl).toString(),
        })),
      ),
    );
  };

export const createRakunLocaleSitemapRouteHandler =
  ({
    paramKey = "language",
    ...options
  }: CreateRakunLocaleSitemapRouteHandlerOptions = {}) =>
  async (
    _request: Request,
    context: RakunSitemapRouteHandlerContext,
  ): Promise<Response> => {
    const params = await context.params;
    const language = getStringParam(params, paramKey);
    const entries = await getRakunSitemap({
      ...options,
      language,
    });

    return createXmlResponse(renderSitemapXml(entries));
  };
