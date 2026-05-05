import type { CookieOptions } from "@rakun-kit/core";

export type RakunNextRouteParams = Record<
  string,
  string | string[] | undefined
>;

export type RakunNextRouteContext = {
  params: Promise<RakunNextRouteParams>;
};

export type RakunNextHandler = (
  request: Request,
  context: RakunNextRouteContext,
) => Promise<Response>;

export type RakunNextIntegrationArgs = {
  request: Request;
  context: RakunNextRouteContext;
  segments: string[];
};

export type RakunNextIntegration = (
  args: RakunNextIntegrationArgs,
) => Promise<Response | null> | Response | null;

export const normalizePathSegments = (
  value: string | string[] | undefined,
): string[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((part) =>
      part.split("/").map((segment) => segment.trim()).filter(Boolean),
    );
  }

  return value
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
};

export const getRouteSegments = async (
  context: RakunNextRouteContext,
): Promise<string[]> => {
  const params = await context.params;

  if (!params) {
    return [];
  }

  for (const value of Object.values(params)) {
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }

    if (typeof value === "string" && value.length > 0) {
      return [value];
    }
  }

  return [];
};

export const headersToObject = (
  headers: Headers,
): Record<string, string | string[] | undefined> => {
  return Object.fromEntries(headers.entries());
};

const serializeCookie = (
  name: string,
  value: string,
  options: CookieOptions = {},
) => {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  segments.push(`Path=${options.path ?? "/"}`);

  if (options.domain) {
    segments.push(`Domain=${options.domain}`);
  }

  if (options.httpOnly) {
    segments.push("HttpOnly");
  }

  if (options.secure) {
    segments.push("Secure");
  }

  if (options.sameSite) {
    segments.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`);
  }

  if (typeof options.maxAge === "number") {
    segments.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  }

  return segments.join("; ");
};

export const createResponseHeaderAdapter = (headers: Headers) => {
  return {
    setHeader(name: string, value: string | string[]) {
      if (Array.isArray(value)) {
        headers.delete(name);
        for (const part of value) {
          headers.append(name, part);
        }
        return;
      }

      headers.set(name, value);
    },
    cookie(name: string, value: string, options?: CookieOptions) {
      headers.append("Set-Cookie", serializeCookie(name, value, options));
    },
  };
};

export const createSearchParamsObject = (
  url: URL,
): Record<string, string | string[]> => {
  const query: Record<string, string | string[]> = {};

  for (const [key, value] of url.searchParams.entries()) {
    const current = query[key];

    if (typeof current === "undefined") {
      query[key] = value;
      continue;
    }

    if (Array.isArray(current)) {
      current.push(value);
      continue;
    }

    query[key] = [current, value];
  }

  return query;
};

export const matchesPathPrefix = (
  segments: string[],
  prefix: string[],
): boolean => {
  if (prefix.length > segments.length) {
    return false;
  }

  return prefix.every((segment, index) => segments[index] === segment);
};

export const stripTrailingSegments = (
  pathname: string,
  count: number,
): string => {
  let result = pathname;

  for (let index = 0; index < count; index += 1) {
    const lastSlash = result.lastIndexOf("/");
    result = lastSlash <= 0 ? "/" : result.slice(0, lastSlash);
  }

  return result || "/";
};
