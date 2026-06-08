import type { NextFunction, Request, Response, Router } from "express";

import {
  type AnyRakunOperation,
  createRakunOperationDefinitions,
  createRequestContext,
  parseCookieHeader,
  RakunOperationHttpMethod,
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
  (operation: AnyRakunOperation) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertAllowedMutationOrigin(operation, req);
      const ctx = await createContext(req, res);
      if (operation.access === "auth") {
        ctx.getUser();
      }
      const input = getOperationInput(operation, req);
      const result = operation.output.parse(
        await operation.resolve({
          ctx,
          input,
        }),
      );

      await operation.onSuccess?.({
        ctx,
        result,
      });

      res.status(200).json(result);
    } catch (error) {
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
        createHandler(operation),
      );
    }
  };
};
