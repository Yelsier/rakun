import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { AnyRouter } from "@trpc/server";

import {
  createTrpcContext,
  logRakunTrpcError,
  parseCookieHeader,
} from "@rakun/trpc";

import type { RakunNextIntegration } from "./shared";
import {
  createResponseHeaderAdapter,
  headersToObject,
  matchesPathPrefix,
  normalizePathSegments,
  stripTrailingSegments,
} from "./shared";

export type RakunNextTrpcOptions<TRouter extends AnyRouter> = {
  path?: string | string[];
  router: TRouter;
};

export const rakunNextTrpc = <TRouter extends AnyRouter>({
  path = "trpc",
  router,
}: RakunNextTrpcOptions<TRouter>): RakunNextIntegration => {
  const pathSegments = normalizePathSegments(path);

  return async ({ request, segments }) => {
    if (!matchesPathPrefix(segments, pathSegments)) {
      return null;
    }

    const pathname = new URL(request.url).pathname;
    const endpoint = stripTrailingSegments(
      pathname,
      segments.length - pathSegments.length,
    );

    return await fetchRequestHandler({
      endpoint,
      req: request,
      router,
      createContext: async ({ req, resHeaders }) =>
        await createTrpcContext({
          headers: headersToObject(req.headers),
          cookies: parseCookieHeader(req.headers.get("cookie") ?? undefined),
          res: createResponseHeaderAdapter(resHeaders),
        }),
      onError({ error, type, path: errorPath }) {
        logRakunTrpcError({
          error,
          type,
          path: errorPath,
        });
      },
    });
  };
};
