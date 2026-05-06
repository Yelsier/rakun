import {
  registerInternalContentType,
  registerContentType,
} from "./lib/Registry";
import { createLogger, Logger } from "./lib/Logger";
import * as internalContentTypes from "./internal-content-types";
import { syncConfiguredRoutes } from "./api/utils/routes/syncConfiguredRoutes";
import { createMongoConnection } from "./orm";
import { createMediaService } from "./media";
import {
  getRakunBootstrapOptions,
  hasRakunBootstrapped,
  setRakunBootstrapOptions,
  type RakunBootstrapOptions,
} from "./bootstrapState";

let initPromise: Promise<void> | null = null;

const ensureLogger = (): void => {
  const bootstrapOptions = getRakunBootstrapOptions();

  if (!Logger) {
    createLogger({
      level: "info",
      prettify: true,
    });
  }

  if (bootstrapOptions?.logger) {
    createLogger(bootstrapOptions.logger);
  }
};

const ensureMongo = (): void => {
  const bootstrapOptions = getRakunBootstrapOptions();

  if (!bootstrapOptions?.mongo) {
    throw new Error(
      "Rakun MongoDB is not configured. Pass `mongo` to `rakunBootstrap(...)` before serving Rakun requests.",
    );
  }

  createMongoConnection(bootstrapOptions.mongo);
};

const ensureMedia = (): void => {
  const bootstrapOptions = getRakunBootstrapOptions();
  const media = bootstrapOptions?.media;

  if (!media) return;

  createMediaService(media);
};

export const ensureRakunInitialized = async () => {
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    const bootstrapOptions = getRakunBootstrapOptions();

    ensureLogger();
    ensureMongo();
    ensureMedia();

    const shouldSyncRoutes = bootstrapOptions?.syncRoutes;

    if (shouldSyncRoutes !== false) {
      await syncConfiguredRoutes();
    }
  })();

  try {
    await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
};

export const runWithRakunRequestTrace = <T>(
  method: string,
  url: string,
  run: () => T,
): T => {
  if (!Logger) {
    return run();
  }

  return Logger.withTraceScope(() => {
    Logger.addTrace(`${method} ${url}`);
    return run();
  });
};

export const rakunBootstrap = (options: RakunBootstrapOptions) => {
  setRakunBootstrapOptions(options);
  initPromise = null;

  const configuredInternalContentTypes = {
    ...internalContentTypes,
    ...options.internalContentTypes,
  };

  for (const ct of Object.values(configuredInternalContentTypes)) {
    registerInternalContentType(ct, { override: true });
  }

  for (const ct of options.contentTypes) {
    registerContentType(ct);
  }
};

export const ensureRakunBootstrap = (options: RakunBootstrapOptions) => {
  if (hasRakunBootstrapped()) {
    return;
  }

  rakunBootstrap(options);
};

export type { RakunBootstrapOptions };
export type {
  RouteDefinition,
  RouteKey,
  RouteKeys,
} from "./api/utils/routes/routeDefinitions";
export type {
  ApiProxies,
  InputProxy,
  OutputProxy,
} from "./api/proxies";
export { getRakunBootstrapOptions } from "./bootstrapState";
export { default as ContentType } from "./lib/ContentType";
export * from "./lib/fields";
export * from "./lib/fields/Boolean";
export * from "./lib/fields/ContentReference";
export * from "./lib/fields/Date";
export * from "./lib/fields/Field";
export * from "./lib/fields/File";
export * from "./lib/fields/Iterator";
export * from "./lib/fields/Link";
export * from "./lib/fields/List";
export * from "./lib/fields/Number";
export * from "./lib/fields/Relation";
export * from "./lib/fields/Select";
export * from "./lib/fields/SelfRelation";
export * from "./lib/fields/SimpleList";
export * from "./lib/fields/String";

export {
  type AnyRakunOperation,
  type AnyRakunOperationContract,
  createRakunOperationDefinitions,
  createManagerOperationContracts,
  createManagerOperationDefinitions,
  createOperationManifest,
  createOperationPath,
  createWebOperationContracts,
  createWebOperationDefinitions,
  defineOperation,
  defineOperationContract,
  mergeOperationContracts,
  type RakunOperationAccess,
  type RakunOperationContractDefinition,
  type RakunOperationContractMap,
  type RakunOperationDefinitionFromContract,
  type RakunOperationDefinition,
  type RakunOperationHttpMethod,
  type RakunOperationImplementationFromContract,
  type RakunOperationImplementationMap,
  type RakunOperationKind,
  type RakunOperationManifestFromContracts,
  type RakunOperationMeta,
  type RakunOperationMap,
  type RakunOperationSuccessArgs,
} from "./api/operations";
export {
  createRequestContext,
  type CookieOptions,
  type RakunRequestContext,
  type RakunRequestContextInput,
} from "./api/context";
export { getSessionCookie, setSessionCookie } from "./api/sessionCookie";
export {
  handleMediaBinaryUpload,
  type MediaBinaryUploadRequest,
  type MediaBinaryUploadResponse,
} from "./api/routes/manager/auth/media/uploadBinary";
export { parseCookieHeader } from "./lib/utils/parseCookieHeader";
export {
  getPermissionList,
  hasPermissions,
  mapPermissions,
  PermissionsList,
  type Permission,
} from "./lib/Permissions";
export type { MaybeTranslatableValue, TranslatableValue } from "./lib/types";
export { getListField } from "./lib/utils/getListField";
export { getTranslation } from "./lib/utils/getTranslation";
export { Id, isId, type Id as IdType } from "./lib/utils/id";
export { isTranslatableObject } from "./lib/utils/isTranslatableObject";
export { slugify } from "./lib/utils/slugify";
export { Language, ManagerUser, Seo } from "./internal-content-types";
export type { LanguageSchema } from "./internal-content-types/Language";
export type { ManagerUserSchema } from "./internal-content-types/ManagerUser";
export type { EncodedContentType } from "./lib/ContentType";
export type { ListOutput } from "./schemas/manager/list";
export type {
  FinalizeUploadInput,
  FinalizeUploadOutput,
} from "./schemas/manager/media/finalizeUpload";
export type {
  GetMediaUrlInput,
  GetMediaUrlOutput,
} from "./schemas/manager/media/getMediaUrl";
export type {
  PrepareUploadInput,
  PrepareUploadOutput,
} from "./schemas/manager/media/prepareUpload";
export * from "./media";
export * from "./contracts";
export * from "./web";
