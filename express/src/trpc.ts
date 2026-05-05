import { createExpressMiddleware } from "@trpc/server/adapters/express";
import type { AnyRouter } from "@trpc/server";
import type { Router } from "express";

import {
  createTrpcContext,
  logRakunTrpcError,
  parseCookieHeader,
} from "@rakun/trpc";

import type { RakunExpressIntegration } from "./index";

export type RakunExpressTrpcOptions<TRouter extends AnyRouter> = {
  path?: string;
  router: TRouter;
};

export const rakunExpressTrpc = <TRouter extends AnyRouter>({
  path = "/trpc",
  router,
}: RakunExpressTrpcOptions<TRouter>): RakunExpressIntegration => {
  return (expressRouter: Router) => {
    expressRouter.use(
      path,
      createExpressMiddleware({
        router,
        createContext: async ({ req, res }) =>
          await createTrpcContext({
            headers: req.headers,
            cookies: parseCookieHeader(req.headers.cookie),
            res,
          }),
        onError({ error, type, path: errorPath }) {
          logRakunTrpcError({
            error,
            type,
            path: errorPath,
          });
        },
      }),
    );
  };
};
