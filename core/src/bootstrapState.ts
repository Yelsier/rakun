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
import type { AccountRecoveryConfig } from "./auth/accountRecovery";
import type { LoginConfig } from "./auth/loginAdapters";
import type { Platform } from "./platform";

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
   * Manager password-reset URL builder, expiry, and optional mail template.
   * Requires `mail`; core provides the default template.
   */
  accountRecovery?: AccountRecoveryConfig;
  /** Manager login methods. Password login is enabled by default. */
  login?: LoginConfig;
  /**
   * Persistent business event log. Defaults to the built-in MongoDB adapter.
   */
  eventLog?: EventLogServiceConfig;
  translation?: TranslationServiceConfig;
  /** Runtime, framework, and deployment capabilities. Defaults are detected. */
  platform?: Platform;
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
  "contentTypes" | "routes" | "apiOperations" | "literals" | "permissions" | "platform"
> &
  RakunResolvedPluginContributions & {
    fields: RakunPluginFieldDefinition[];
    platform: Platform;
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
