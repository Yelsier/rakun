import {
  getManagerOperationMeta,
  type ManagerOperationInput,
  type ManagerOperationMeta,
  type ManagerOperationName,
  type ManagerOperationOutput,
} from "./operations";
import {
  createManagerClient,
  normalizeManagerRequestArgs,
  type ManagerClient,
  type ManagerGenericOperationMeta,
  type ManagerGenericRequestFn,
  type ManagerRequestFn,
} from "./request";
import {
  instanceofAppErrorShape,
  type AppErrorShape,
} from "@rakun-kit/core/client";

const getAppErrorShape = (error: unknown): AppErrorShape | null => {
  if (instanceofAppErrorShape(error)) {
    return error;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const record = error as Record<string, unknown>;

  if ("appError" in record && instanceofAppErrorShape(record.appError)) {
    return record.appError;
  }

  return null;
};

export class ManagerHttpError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ManagerHttpError";
    this.status = status;
    this.body = body;
  }
}

export type CreateHttpManagerRequestOptions = {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
};

const joinUrl = (baseUrl: string, path: string) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const isAbsoluteUrl = (value: string) => /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)

const createRequestUrl = (baseUrl: string, path: string) => {
  const joinedUrl = joinUrl(baseUrl, path)

  if (isAbsoluteUrl(joinedUrl)) {
    return new URL(joinedUrl)
  }

  if (typeof globalThis.location?.origin === "string") {
    return new URL(joinedUrl, globalThis.location.origin)
  }

  throw new Error(
    `Invalid URL: "${joinedUrl}". Use an absolute baseUrl when running outside the browser.`,
  )
}

const appendSearchParams = (url: URL, input: unknown) => {
  if (!input || typeof input !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      url.searchParams.set(key, String(value));
      continue;
    }

    url.searchParams.set(key, JSON.stringify(value));
  }
};

const readResponseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await response.json();
  }

  const text = await response.text();
  return text || null;
};

export const createHttpManagerRequest = ({
  baseUrl,
  fetch: fetchImpl = globalThis.fetch,
  headers,
  credentials = "include",
}: CreateHttpManagerRequestOptions): ManagerRequestFn => {
  if (!fetchImpl) {
    throw new Error(
      "A fetch implementation is required to create an HTTP manager request.",
    );
  }

  const request: ManagerRequestFn = async (...args) => {
    const { name, input, options } = normalizeManagerRequestArgs(args);
    const meta = getManagerOperationMeta(
      name as ManagerOperationName,
    ) as ManagerOperationMeta;
    const url = createRequestUrl(baseUrl, meta.path);

    if (meta.method === "get" && input !== undefined) {
      appendSearchParams(url, input);
    }

    const response = await fetchImpl(url.toString(), {
      method: meta.method.toUpperCase(),
      credentials,
      signal: options?.signal,
      headers: {
        ...(meta.method === "post"
          ? { "Content-Type": "application/json; charset=utf-8" }
          : {}),
        ...headers,
        ...options?.headers,
      },
      body:
        meta.method === "post" && input !== undefined
          ? JSON.stringify(input)
          : undefined,
    });

    const body = await readResponseBody(response);

    if (!response.ok) {
      const appError = getAppErrorShape(body);

      if (appError) {
        throw appError;
      }

      const message =
        typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof body.message === "string"
          ? body.message
          : `Manager request failed with status ${response.status}`;

      throw new ManagerHttpError(message, response.status, body);
    }

    return body as ManagerOperationOutput<typeof name>;
  };

  return request;
};

export const createHttpManagerOperationRequest = ({
  baseUrl,
  fetch: fetchImpl = globalThis.fetch,
  headers,
  credentials = "include",
}: CreateHttpManagerRequestOptions): ManagerGenericRequestFn => {
  if (!fetchImpl) {
    throw new Error(
      "A fetch implementation is required to create an HTTP manager request.",
    );
  }

  return async (
    _name: string,
    input: unknown,
    meta: ManagerGenericOperationMeta,
    options,
  ) => {
    const url = createRequestUrl(baseUrl, meta.path);

    if (meta.method === "get" && input !== undefined) {
      appendSearchParams(url, input);
    }

    const response = await fetchImpl(url.toString(), {
      method: meta.method.toUpperCase(),
      credentials,
      signal: options?.signal,
      headers: {
        ...(meta.method === "post"
          ? { "Content-Type": "application/json; charset=utf-8" }
          : {}),
        ...headers,
        ...options?.headers,
      },
      body:
        meta.method === "post" && input !== undefined
          ? JSON.stringify(input)
          : undefined,
    });

    const body = await readResponseBody(response);

    if (!response.ok) {
      const appError = getAppErrorShape(body);

      if (appError) {
        throw appError;
      }

      const message =
        typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof body.message === "string"
          ? body.message
          : `Manager request failed with status ${response.status}`;

      throw new ManagerHttpError(message, response.status, body);
    }

    return body;
  };
};

export const createHttpManagerClient = (
  options: CreateHttpManagerRequestOptions,
): ManagerClient =>
  createManagerClient(
    createHttpManagerRequest(options),
    createHttpManagerOperationRequest(options),
  );

export type {
  ManagerClient,
  ManagerOperationInput,
  ManagerOperationName,
  ManagerOperationOutput,
};
