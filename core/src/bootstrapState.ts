import type ContentType from "./lib/ContentType";
import type { createLogger } from "./lib/Logger";
import type { LiteralCatalogInput } from "./literals/definitions";
import type { MediaServiceConfig } from "./media";
import type { MongoConfig } from "./orm/database";
import type { RouteDefinition } from "./api/utils/routes/routeDefinitions";
import type { ApiProxies } from "./api/proxies";
import type { RakunOperationMap } from "./api/operations/types";

export interface RakunBootstrapOptions {
  literals: LiteralCatalogInput;
  contentTypes: ContentType[];
  internalContentTypes?: {
    Page?: ContentType;
  };
  routes?: readonly RouteDefinition[];
  proxies?: ApiProxies;
  apiOperations?: RakunOperationMap;
  mongo?: MongoConfig;
  media?: MediaServiceConfig;
  logger?: Parameters<typeof createLogger>[0];
  revalidate?:
    | {
        url: string;
        token: string;
        timeoutMs?: number;
      }
    | false;
  syncRoutes?: boolean;
}

let bootstrapOptions: RakunBootstrapOptions | null = null;
let bootstrapped = false;

export const getRakunBootstrapOptions = (): RakunBootstrapOptions | null =>
  bootstrapOptions;

export const setRakunBootstrapOptions = (
  options: RakunBootstrapOptions,
): void => {
  bootstrapOptions = options;
  bootstrapped = true;
};

export const hasRakunBootstrapped = (): boolean => bootstrapped;
