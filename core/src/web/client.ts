import type { ZodType } from "zod";

import {
  createOperationPath,
  type AnyRakunOperation,
  type RakunOperationHttpMethod,
  type RakunOperationKind,
  type RakunOperationMap,
} from "../api/operations/types";

type OperationInput<TOperation extends AnyRakunOperation> =
  TOperation extends {
    input: ZodType<infer TInput>;
  }
    ? TInput
    : undefined;

type OperationOutput<TOperation extends AnyRakunOperation> =
  TOperation extends {
    output: ZodType<infer TOutput>;
  }
    ? TOutput
    : never;

type OperationKind<TOperation extends AnyRakunOperation> =
  TOperation extends {
    kind: infer TKind;
  }
    ? TKind & RakunOperationKind
    : never;

type OperationNamesByKind<
  TOperations extends RakunOperationMap,
  TKind extends RakunOperationKind,
> = {
  [TName in keyof TOperations & string]: OperationKind<
    TOperations[TName]
  > extends TKind
    ? TName
    : never;
}[keyof TOperations & string];

type OperationArgs<
  TOperations extends RakunOperationMap,
  TName extends keyof TOperations & string,
> = undefined extends OperationInput<TOperations[TName]>
  ? [
      name: TName,
      input?: OperationInput<TOperations[TName]>,
      options?: RakunApiRequestOptions,
    ]
  : [
      name: TName,
      input: OperationInput<TOperations[TName]>,
      options?: RakunApiRequestOptions,
    ];

export type RakunApiRequestOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  method?: RakunOperationHttpMethod;
  path?: string;
};

export type RakunApiResponse = {
  ok: boolean;
  status: number;
  headers: {
    get: (name: string) => string | null;
  };
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

export type RakunApiFetch = (
  input: string,
  init?: {
    method?: string;
    credentials?: "include" | "omit" | "same-origin";
    signal?: AbortSignal;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<RakunApiResponse>;

export type CreateRakunApiClientOptions = {
  baseUrl?: string;
  fetch?: RakunApiFetch;
  headers?: Record<string, string>;
  credentials?: "include" | "omit" | "same-origin";
};

export type GetClient<TOperations extends RakunOperationMap> = {
  query: <
    TName extends OperationNamesByKind<TOperations, "query">,
  >(
    ...args: OperationArgs<TOperations, TName>
  ) => Promise<OperationOutput<TOperations[TName]>>;
  mutation: <
    TName extends OperationNamesByKind<TOperations, "mutation">,
  >(
    ...args: OperationArgs<TOperations, TName>
  ) => Promise<OperationOutput<TOperations[TName]>>;
};

const joinUrl = (baseUrl: string, path: string) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const isAbsoluteUrl = (value: string) => /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);

const createRequestUrl = (baseUrl: string, path: string) => {
  const joinedUrl = joinUrl(baseUrl, path);

  if (isAbsoluteUrl(joinedUrl)) {
    return new URL(joinedUrl);
  }

  const location = (globalThis as { location?: { origin?: string } }).location;

  if (typeof location?.origin === "string") {
    return new URL(joinedUrl, location.origin);
  }

  throw new Error(
    `Invalid URL: "${joinedUrl}". Use an absolute baseUrl when running outside the browser.`,
  );
};

const appendSearchParams = (url: URL, input: unknown) => {
  if (!input || typeof input !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;

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

const readResponseBody = async (response: RakunApiResponse) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await response.json();
  }

  const text = await response.text();
  return text || null;
};

const createRequest = ({
  baseUrl = "/api",
  fetch: fetchImpl = (globalThis as { fetch?: RakunApiFetch }).fetch,
  headers,
  credentials = "include",
}: CreateRakunApiClientOptions) => {
  if (!fetchImpl) {
    throw new Error("A fetch implementation is required to create a Rakun API client.");
  }

  return async (
    name: string,
    input: unknown,
    defaultMethod: RakunOperationHttpMethod,
    options?: RakunApiRequestOptions,
  ) => {
    const method = options?.method ?? defaultMethod;
    const path = options?.path ?? createOperationPath(name);
    const url = createRequestUrl(baseUrl, path);

    if (method === "get" && input !== undefined) {
      appendSearchParams(url, input);
    }

    const response = await fetchImpl(url.toString(), {
      method: method.toUpperCase(),
      credentials,
      signal: options?.signal,
      headers: {
        ...(method === "post"
          ? { "Content-Type": "application/json; charset=utf-8" }
          : {}),
        ...headers,
        ...options?.headers,
      },
      body:
        method === "post" && input !== undefined
          ? JSON.stringify(input)
          : undefined,
    });
    const body = await readResponseBody(response);

    if (!response.ok) {
      const message =
        typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof body.message === "string"
          ? body.message
          : `Rakun API request failed with status ${response.status}`;

      throw new Error(message);
    }

    return body;
  };
};

export const createRakunApiClient = <
  TOperations extends RakunOperationMap,
>(
  options: CreateRakunApiClientOptions = {},
): GetClient<TOperations> => {
  const run = createRequest(options);

  return {
    query: (async (name: string, input?: unknown, requestOptions?: RakunApiRequestOptions) =>
      await run(name, input, requestOptions?.method ?? "get", requestOptions)) as GetClient<TOperations>["query"],
    mutation: (async (name: string, input?: unknown, requestOptions?: RakunApiRequestOptions) =>
      await run(name, input, requestOptions?.method ?? "post", requestOptions)) as GetClient<TOperations>["mutation"],
  };
};
