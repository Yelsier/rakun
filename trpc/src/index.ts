import {
  createRequestContext,
  parseCookieHeader,
} from "@rakun-kit/core";
import { Logger } from "@rakun-kit/core/logger";

import { mergeRouters } from "./router";
import { createManagerRouter } from "./routers/manager";
import { createWebRouter } from "./routers/web";

export const createRakunTrpcRouter = () =>
  mergeRouters(createManagerRouter(), createWebRouter());

export const appRouter = createRakunTrpcRouter();

export type AppRouter = typeof appRouter;

export const createTrpcContext = createRequestContext;

export const logRakunTrpcError = ({
  error,
  type,
  path,
}: {
  error: {
    code?: string;
    cause?: unknown;
  };
  type: string;
  path?: string;
}) => {
  if (error.code === "FORBIDDEN") {
    const nestedCause =
      error.cause &&
      typeof error.cause === "object" &&
      "cause" in error.cause
        ? (error.cause as { cause?: unknown }).cause
        : undefined;

    Logger?.debug("Forbidden", {
      path,
      type,
      error: nestedCause || error,
    });
  }

  if (error.code === "INTERNAL_SERVER_ERROR") {
    Logger?.error(`tRPC ${type} ${path ?? ""}`, error);
  }
};

export { parseCookieHeader };
export { routerInfo } from "./router";
