import type { NextFunction, Request, Response, Router } from "express";

import {
  type AnyRakunOperation,
  createRakunOperationDefinitions,
  createRequestContext,
  parseCookieHeader,
  recordApiError,
  type RakunRequestContext,
  RakunOperationHttpMethod,
  runContentHookContext,
} from "@rakun-kit/core";
import {
  getAppErrorShape,
  getAppErrorStatusCode,
  isAppError,
  throwAppError,
} from "@rakun-kit/core/errors";

import type { RakunExpressIntegration } from "./index";

const toRoutePath = (name: string) => `/${name.split(".").join("/")}`;

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

const createContext = async (req: Request, res: Response) => {
  return await createRequestContext({
    headers: req.headers,
    cookies: parseCookieHeader(req.headers.cookie),
    ip: req.ip || req.socket.remoteAddress,
    res,
  });
};

const getHeaderValue = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

const getAllowedOrigins = () =>
  (process.env.MANAGER_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const assertAllowedMutationOrigin = (
  operation: AnyRakunOperation,
  req: Request,
) => {
  if (operation.kind !== "mutation") return;

  const origin = getHeaderValue(req.headers.origin);
  if (!origin) return;

  if (getAllowedOrigins().includes(origin)) return;

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throwAppError("FORBIDDEN", { reason: "INVALID_ORIGIN" });
  }

  const allowedHosts = [
    getHeaderValue(req.headers.host),
    getHeaderValue(req.headers["x-forwarded-host"]),
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

const getOperationInput = (operation: AnyRakunOperation, req: Request) => {
  if (!operation.input) {
    return undefined;
  }

  const rawInput = operation.method === "get" ? req.query : req.body;

  return operation.input.parse(rawInput);
};

const createHandler =
  (name: string, operation: AnyRakunOperation) =>
  async (req: Request, res: Response, next: NextFunction) => {
    let ctx: RakunRequestContext | undefined;

    try {
      assertAllowedMutationOrigin(operation, req);
      const requestContext = await createContext(req, res);
      ctx = requestContext;
      if (operation.access === "auth") {
        requestContext.getUser();
      }
      const result = await runContentHookContext(
        { requestContext },
        async () => {
          const input = getOperationInput(operation, req);
          const parsedResult = operation.output.parse(
            await operation.resolve({
              ctx: requestContext,
              input,
            }),
          );

          await operation.onSuccess?.({
            ctx: requestContext,
            result: parsedResult,
          });

          return parsedResult;
        },
      );

      res.status(200).json(result);
    } catch (error) {
      await recordApiError({
        name,
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
        res.status(getAppErrorStatusCode(error) ?? 500).json({
          message: error.message,
          appError: getAppErrorShape(error),
        });
        return;
      }

      if (hasIssues(error)) {
        res.status(400).json({
          message: error.message ?? "Invalid input",
          issues: error.issues,
        });
        return;
      }

      next(error);
    }
  };

export const rakunExpressCrud = (): RakunExpressIntegration => {
  return (router: Router) => {
    const operations = createRakunOperationDefinitions();

    for (const [name, operation] of Object.entries(operations)) {
      router[operation.method as RakunOperationHttpMethod](
        toRoutePath(name),
        createHandler(name, operation),
      );
    }
  };
};
