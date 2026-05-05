import { Redirect } from "../../../internal-content-types";
import { DBOutput } from "../../../lib/types";
import { getMongoService } from "../../../orm";

type HeadersMap = Record<string, string | undefined>;

type ResolveRedirectInput = {
  path: string;
  search?: string;
  headers?: HeadersMap;
};

type RedirectResolution = {
  to: string;
  status: number;
};

type RedirectFunctionResult = {
  params?: Record<string, string>;
  destinationPath?: string;
};

type RedirectFunctionContext = {
  headers: HeadersMap;
  params: Record<string, string>;
  path: string;
  search?: string;
  config: unknown;
};

type RedirectFunction = (
  input: RedirectFunctionContext,
) => RedirectFunctionResult | null;

const DEFAULT_STATUS = 302;
const TOKEN_REGEX = /\{([a-zA-Z0-9_]+)\}/g;
const MAX_HEADER_REGEX_LENGTH = 120;

const normalizePath = (rawPath: string): string => {
  let path = rawPath.trim();
  if (!path.startsWith("/")) path = `/${path}`;
  if (!path.endsWith("/")) path = `${path}/`;
  return path.replace(/\/\/+/g, "/");
};

const normalizeSearch = (search?: string): string => {
  if (!search) return "";
  if (search === "?") return "";
  return search.startsWith("?") ? search : `?${search}`;
};

const getHeader = (headers: HeadersMap, name?: string): string | undefined => {
  if (!name) return undefined;
  return headers[name.toLowerCase()];
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const isSafeHeaderRegexPattern = (pattern: string): boolean => {
  if (!pattern || pattern.length > MAX_HEADER_REGEX_LENGTH) return false;
  // Disallow grouping, alternation and backrefs to avoid high-risk
  // backtracking constructs like nested quantified groups.
  if (/[()|]/.test(pattern)) return false;
  if (/\\[1-9]/.test(pattern)) return false;
  return true;
};

const extractPathParams = (
  patternPath: string,
  currentPath: string,
): Record<string, string> | null => {
  const normalizedPattern = normalizePath(patternPath);
  const normalizedCurrentPath = normalizePath(currentPath);

  let regexBody = "";
  let lastIndex = 0;
  const names: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = TOKEN_REGEX.exec(normalizedPattern)) !== null) {
    const [fullMatch, name] = match;
    regexBody += escapeRegex(normalizedPattern.slice(lastIndex, match.index));
    regexBody += "([^/]+)";
    names.push(name);
    lastIndex = match.index + fullMatch.length;
  }

  regexBody += escapeRegex(normalizedPattern.slice(lastIndex));

  const regex = new RegExp(`^${regexBody}$`);
  const result = regex.exec(normalizedCurrentPath);
  if (!result) return null;

  return Object.fromEntries(
    names.map((name, index) => [
      name,
      safeDecodeURIComponent(result[index + 1] ?? ""),
    ]),
  );
};

const applyTemplate = (
  template: string,
  params: Record<string, string>,
): string => {
  return template.replace(
    TOKEN_REGEX,
    (_fullMatch, name: string) => params[name] ?? "",
  );
};

const getStatusCode = (redirect: DBOutput<typeof Redirect>): number => {
  if (redirect.statusMode === "custom") {
    const custom = Number(redirect.customStatus);
    if (Number.isInteger(custom) && custom >= 300 && custom <= 399) {
      return custom;
    }
    return DEFAULT_STATUS;
  }
  const parsed = Number(redirect.statusMode);
  if (Number.isInteger(parsed) && parsed >= 300 && parsed <= 399) {
    return parsed;
  }
  return DEFAULT_STATUS;
};

const parseJSON = (value?: unknown): unknown => {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const getPrimaryLanguage = (acceptLanguage?: string): string | undefined => {
  if (!acceptLanguage) return undefined;
  const [firstEntry] = acceptLanguage.split(",");
  if (!firstEntry) return undefined;
  const [langRaw] = firstEntry.split(";");
  if (!langRaw) return undefined;
  const [primary] = langRaw.trim().toLowerCase().split("-");
  return primary || undefined;
};

const redirectFunctions: Record<string, RedirectFunction> = {
  acceptLanguageToParam: ({ headers, config }) => {
    const parsed = config as {
      param?: string;
      supported?: string[];
      fallback?: string;
    };
    const paramName = parsed.param || "locale";
    const supported = Array.isArray(parsed.supported) ? parsed.supported : [];
    const fallback = typeof parsed.fallback === "string" ? parsed.fallback : "";
    const lang = getPrimaryLanguage(getHeader(headers, "accept-language"));
    const selected =
      lang && supported.includes(lang)
        ? lang
        : fallback || supported[0] || lang || "";
    if (!selected) return null;
    return {
      params: {
        [paramName]: selected,
      },
    };
  },
  headerValueToParam: ({ headers, config }) => {
    const parsed = config as {
      header?: string;
      param?: string;
      map?: Record<string, string>;
      fallback?: string;
      lowercase?: boolean;
    };
    if (!parsed.header || !parsed.param) return null;
    const raw = getHeader(headers, parsed.header);
    const value = parsed.lowercase ? raw?.toLowerCase() : raw;
    if (!value) {
      if (!parsed.fallback) return null;
      return { params: { [parsed.param]: parsed.fallback } };
    }
    const mapped = parsed.map?.[value] ?? parsed.fallback;
    if (!mapped) return null;
    return {
      params: {
        [parsed.param]: mapped,
      },
    };
  },
};

const matchesHeaderCondition = (
  redirect: DBOutput<Redirect>,
  headers: HeadersMap,
): boolean => {
  const mode = redirect.headerMatchMode;
  if (mode === "none") return true;

  const headerValue = getHeader(headers, redirect.headerName);

  if (mode === "exists") {
    return typeof headerValue === "string" && headerValue.length > 0;
  }

  if (!headerValue || !redirect.headerValue) {
    return false;
  }

  if (mode === "equals") return headerValue === redirect.headerValue;
  if (mode === "contains") return headerValue.includes(redirect.headerValue);
  if (mode === "startsWith")
    return headerValue.startsWith(redirect.headerValue);
  if (mode === "regex") {
    if (!isSafeHeaderRegexPattern(redirect.headerValue)) return false;
    try {
      return new RegExp(redirect.headerValue).test(headerValue);
    } catch {
      return false;
    }
  }

  return false;
};

export const resolveRedirect = async ({
  path,
  search,
  headers = {},
}: ResolveRedirectInput): Promise<RedirectResolution | null> => {
  const db = await getMongoService();
  // TODO: optimize by caching redirects and only re-fetching on changes
  const redirects = (
    await db.list(Redirect, {
      filter: { enabled: true },
      options: { limit: "all" },
    })
  ).items;

  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  for (const redirect of redirects) {
    const params = extractPathParams(redirect.sourcePath, path);
    if (!params) continue;

    if (!matchesHeaderCondition(redirect, normalizedHeaders)) continue;

    const functionName = redirect.functionName;
    const fn = functionName ? redirectFunctions[functionName] : undefined;
    let customResult: RedirectFunctionResult | null = null;
    if (fn) {
      customResult = fn({
        headers: normalizedHeaders,
        params,
        path: normalizePath(path),
        search: normalizeSearch(search),
        config: parseJSON(redirect.functionConfig),
      });
      if (customResult === null) continue;
    }

    const finalParams = {
      ...params,
      ...(customResult?.params ?? {}),
    };
    const destinationTemplate =
      customResult?.destinationPath || redirect.destinationPath;
    const baseDestination = normalizePath(
      applyTemplate(destinationTemplate, finalParams),
    );
    const to = redirect.preserveQuery
      ? `${baseDestination}${normalizeSearch(search)}`
      : baseDestination;

    return {
      to,
      status: getStatusCode(redirect),
    };
  }

  return null;
};
