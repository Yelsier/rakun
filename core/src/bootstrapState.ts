import type ContentType from "./lib/ContentType";
import type { createLogger } from "./lib/Logger";
import type { LiteralCatalogInput } from "./literals/definitions";
import type { MediaServiceConfig } from "./media";
import type { MailServiceConfig } from "./mail";
import type { EventLogServiceConfig } from "./eventLog";
import type { TranslationServiceConfig } from "./translation";
import type { MongoConfig } from "./orm/database";
import type { RouteDefinition } from "./api/utils/routes/routeDefinitions";
import type { RakunOperationMap } from "./api/operations/types";
import type {
  RakunPluginDefinition,
  RakunPluginFieldDefinition,
  RakunResolvedPluginContributions,
} from "./plugins";
import type { ManagerLanguagePack } from "./schemas/manager/uiLocales";
import type { AccountRecoveryConfig } from './auth/accountRecovery'

export interface RakunBootstrapOptions {
  literals: LiteralCatalogInput;
  contentTypes: RakunContentType[];
  internalContentTypes?: {
    Page?: RakunContentType;
  };
  routes?: readonly RouteDefinition[];
  apiOperations?: RakunOperationMap;
  plugins?: readonly RakunPluginDefinition[];
  permissions?: readonly string[];
  /**
   * Installable manager UI locale packs (ICU key/value messages).
   * English is always built into the manager client; list extra locales here.
   */
  managerLanguages?: readonly ManagerLanguagePack[];
  mongo?: MongoConfig;
  media?: MediaServiceConfig;
  mail?: MailServiceConfig;
  /**
   * Account recovery email template and manager reset URL builder.
   * Requires `mail` to be configured.
   */
  accountRecovery?: AccountRecoveryConfig;
  /**
   * Persistent business event log. Defaults to the built-in MongoDB adapter.
   */
  eventLog?: EventLogServiceConfig;
  translation?: TranslationServiceConfig;
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

export type RakunContentType = ContentType;

export type ResolvedRakunBootstrapOptions = Omit<
  RakunBootstrapOptions,
  "contentTypes" | "routes" | "apiOperations" | "literals" | "permissions"
> &
  RakunResolvedPluginContributions & {
    fields: RakunPluginFieldDefinition[];
  };

let bootstrapOptions: ResolvedRakunBootstrapOptions | null = null;
let bootstrapped = false;

export const getRakunBootstrapOptions =
  (): ResolvedRakunBootstrapOptions | null => bootstrapOptions;

export const setRakunBootstrapOptions = (
  options: ResolvedRakunBootstrapOptions,
): void => {
  bootstrapOptions = options;
  bootstrapped = true;
};

export const hasRakunBootstrapped = (): boolean => bootstrapped;
