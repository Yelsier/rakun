import { AsyncLocalStorage } from "node:async_hooks";

import type { z } from "zod";
import type { FlattenTranslate } from "../../lib/types";
import type { RouteDefinition } from "../utils/routes/routeDefinitions";

type RouteWithInfo<Routes extends readonly RouteDefinition[]> =
  Routes[number] extends infer Route
    ? Route extends { infoSchema: z.ZodTypeAny }
      ? Route
      : RouteDefinition extends Route
        ? Route & { infoSchema: z.ZodTypeAny }
        : never
    : never;

type ProxyContextFromRoute<Route> = Route extends {
  contentType: infer ContentType extends string;
  infoSchema: infer InfoSchema extends z.ZodTypeAny;
}
  ? {
      type: ContentType;
      info: FlattenTranslate<z.infer<InfoSchema>>;
      locale: string;
    }
  : never;

export type ProxyContext<
  Routes extends readonly RouteDefinition[] = readonly RouteDefinition[],
> = ProxyContextFromRoute<RouteWithInfo<Routes>>;

const storage = new AsyncLocalStorage<ProxyContext>();

export function runProxyContext<T>(
  context: ProxyContext,
  callback: () => T,
): T {
  return storage.run(context, callback);
}

export function getProxyContext<
  Routes extends readonly RouteDefinition[] = readonly RouteDefinition[],
>(): ProxyContext<Routes> {
  return (storage.getStore() ?? ({} as ProxyContext)) as ProxyContext<Routes>;
}
