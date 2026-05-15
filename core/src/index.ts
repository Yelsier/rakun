import {
  registerInternalContentType,
  registerContentType,
} from "./lib/Registry";
import { createLogger, Logger } from "./lib/Logger";
import * as internalContentTypes from "./internal-content-types";
import { syncConfiguredRoutes } from "./api/utils/routes/syncConfiguredRoutes";
import { createMongoConnection, getMongoService } from "./orm";
import { runMigrations } from "./orm/migrations";
import { createMediaService } from "./media";
import {
  getRakunBootstrapOptions,
  hasRakunBootstrapped,
  setRakunBootstrapOptions,
  type RakunBootstrapOptions,
} from "./bootstrapState";
import { setLiteralCatalog } from "./literals/definitions";

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

    const db = await getMongoService();
    await runMigrations(db);

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

  const printTrace = (startedAt: number, status: "ok" | "error") => {
    const bootstrapOptions = getRakunBootstrapOptions();

    if (!bootstrapOptions?.logger?.verbose && !Logger.isVerbose()) {
      return;
    }

    Logger.debug("Rakun request trace", {
      method,
      url,
      status,
      durationMs: Date.now() - startedAt,
      steps: Logger.getTrace(),
    });
  };

  return Logger.withTraceScope(() => {
    const startedAt = Date.now();
    Logger.addTrace(`${method} ${url}`);
    try {
      const result = run();

      if (
        result &&
        typeof result === "object" &&
        "then" in result &&
        typeof result.then === "function"
      ) {
        return result.then(
          (value: Awaited<T>) => {
            printTrace(startedAt, "ok");
            return value;
          },
          (error: unknown) => {
            printTrace(startedAt, "error");
            throw error;
          },
        ) as T;
      }

      printTrace(startedAt, "ok");
      return result;
    } catch (error) {
      printTrace(startedAt, "error");
      throw error;
    }
  });
};

export const rakunBootstrap = (options: RakunBootstrapOptions) => {
  setRakunBootstrapOptions(options);
  setLiteralCatalog(options.literals);
  initPromise = null;

  const configuredInternalContentTypes = {
    ...internalContentTypes,
    ...options.internalContentTypes,
  };
  const routeableContentTypes = new Set(
    (options.routes ?? [])
      .filter((route) => route.hasPage)
      .map((route) => route.contentType),
  );

  for (const ct of Object.values(configuredInternalContentTypes)) {
    if (routeableContentTypes.has(ct.name)) {
      ct.enableDocumentVisibility();
    }
    registerInternalContentType(ct, { override: true });
  }

  for (const ct of options.contentTypes) {
    if (routeableContentTypes.has(ct.name)) {
      ct.enableDocumentVisibility();
    }
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
export type { ApiProxies, InputProxy, OutputProxy } from "./api/proxies";
export { getRakunBootstrapOptions } from "./bootstrapState";
export {
  default as ContentType,
  DocumentVisibility,
  type ContentTypeMigration,
  type ContentTypeMigrationContext,
  type VersioningOptions,
} from "./lib/ContentType";
export * from "./lib/fields";

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
} from "./api/routes/manager/media/uploadBinary";
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
