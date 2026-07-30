import {
  type AnyRakunOperation,
  createRakunOperationDefinitions,
  createRequestContext,
  parseCookieHeader,
  recordApiError,
  type RakunRequestContext,
  runContentHookContext,
} from "@rakun-kit/core";
import {
  getAppErrorShape,
  getAppErrorStatusCode,
  isAppError,
  throwAppError,
} from "@rakun-kit/core/errors";

import type { RakunNextIntegration } from "./shared";
import {
  createResponseHeaderAdapter,
  createSearchParamsObject,
  headersToObject,
} from "./shared";

const toRoutePath = (name: string) => name.split(".").join("/");

const hasIssues = (
  error: unknown,
): error is {
  issues: unknown[];
  message?: string;
} => {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues?: unknown }).issues)
  );
};

const jsonResponse = (
  status: number,
  body: unknown,
  headers: Headers = new Headers(),
) => {
  const responseHeaders = new Headers(headers);

  if (!responseHeaders.has("Content-Type")) {
    responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
};

const readJsonBody = async (request: Request) => {
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return undefined;
  }

  return JSON.parse(rawBody);
};

const getAllowedOrigins = () =>
  (process.env.MANAGER_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const assertAllowedMutationOrigin = (
  operation: AnyRakunOperation,
  request: Request,
) => {
  if (operation.kind !== "mutation") return;

  const origin = request.headers.get("origin");
  if (!origin) return;

  if (getAllowedOrigins().includes(origin)) return;

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throwAppError("FORBIDDEN", { reason: "INVALID_ORIGIN" });
  }

  const allowedHosts = [
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
  ].filter(Boolean);

  if (allowedHosts.includes(originUrl.host)) return;

  const baseDomain = process.env.BASE_DOMAIN;
  if (
    baseDomain &&
    (originUrl.hostname === baseDomain ||
      originUrl.hostname.endsWith(`.${baseDomain}`))
  ) {
    return;
  }

  throwAppError("FORBIDDEN", { reason: "INVALID_ORIGIN" });
};

const getOperationInput = async (
  operation: AnyRakunOperation,
  request: Request,
) => {
  if (!operation.input) {
    return undefined;
  }

  if (operation.method === "get") {
    return operation.input.parse(createSearchParamsObject(new URL(request.url)));
  }

  return operation.input.parse(await readJsonBody(request));
};

const createOperationResponse = async (
  operation: AnyRakunOperation,
  request: Request,
  onContext: (ctx: RakunRequestContext) => void,
) => {
  assertAllowedMutationOrigin(operation, request);
  const headers = new Headers();
  const ctx = await createRequestContext({
    headers: headersToObject(request.headers),
    cookies: parseCookieHeader(request.headers.get("cookie") ?? undefined),
    res: createResponseHeaderAdapter(headers),
  });
  onContext(ctx);
  if (operation.access === "auth") {
    ctx.getUser();
  }
  const result = await runContentHookContext(
    { requestContext: ctx },
    async () => {
      const input = await getOperationInput(operation, request);
      const parsedResult = operation.output.parse(
        await operation.resolve({
          ctx,
          input,
        }),
      );

      await operation.onSuccess?.({
        ctx,
        result: parsedResult,
      });

      return parsedResult;
    },
  );

  return jsonResponse(200, result, headers);
};

export const rakunNextCrud = (): RakunNextIntegration => {
  let operationsByPath: Map<string, AnyRakunOperation> | null = null;

  const getOperationsByPath = () => {
    if (!operationsByPath) {
      operationsByPath = new Map(
        Object.entries(createRakunOperationDefinitions()).map(
          ([name, operation]) => [toRoutePath(name), operation],
        ),
      );
    }

    return operationsByPath;
  };

  return async ({ request, segments }) => {
    const operation = getOperationsByPath().get(segments.join("/"));

    if (!operation) {
      return null;
    }

    if (request.method.toLowerCase() !== operation.method) {
      return jsonResponse(405, {
        message: `Method ${request.method} is not allowed for this route`,
      });
    }

    let ctx: RakunRequestContext | undefined;

    try {
      return await createOperationResponse(operation, request, (requestContext) => {
        ctx = requestContext;
      });
    } catch (error) {
      await recordApiError({
        name: [...segments].join("."),
        operation,
        ctx,
        error,
        boundary: true,
        statusCode: isAppError(error)
          ? (getAppErrorStatusCode(error) ?? 500)
          : hasIssues(error)
            ? 400
            : 500,
      });

      if (isAppError(error)) {
        return jsonResponse(
          getAppErrorStatusCode(error) ?? 500,
          {
            message: error.message,
            appError: getAppErrorShape(error),
          },
        );
      }

      if (hasIssues(error)) {
        return jsonResponse(400, {
          message: error.message ?? "Invalid input",
          issues: error.issues,
        });
      }

      throw error;
    }
  };
};
