import { AsyncLocalStorage } from "node:async_hooks";

import z from "zod";
import { FlattenTranslate } from "../../lib/types";
import { RouteDefinition } from "../utils/routes/routeDefinitions";

type RouteWithInfo = RouteDefinition & { infoSchema: z.ZodTypeAny };

export type ProxyContext = {
  [R in RouteWithInfo as R["contentType"]]: {
    type: R["contentType"];
    info: FlattenTranslate<z.infer<R["infoSchema"]>>;
    locale: string;
  };
}[RouteWithInfo["contentType"]];

const storage = new AsyncLocalStorage<ProxyContext>();

export function runProxyContext<T>(
  context: ProxyContext,
  callback: () => T,
): T {
  return storage.run(context, callback);
}

export function getProxyContext(): ProxyContext {
  return storage.getStore() ?? ({} as ProxyContext);
}
