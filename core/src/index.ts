import {
  registerInternalContentType,
  registerContentType,
} from "./lib/Registry";
import { createLogger, Logger } from "./lib/Logger";
import * as internalContentTypes from "./internal-content-types";
import { applyManagerRoleHooks } from "./internal-content-types/ManagerRoleHooks";
import { applyManagerUserHooks } from "./internal-content-types/ManagerUserHooks";
import { syncAdminRole } from "./internal-content-types/syncAdminRole";
import { syncConfiguredRoutes } from "./api/utils/routes/syncConfiguredRoutes";
import { createMongoConnection, getMongoService } from "./orm";
import { runMigrations } from "./orm/migrations";
import { createMediaService, getMediaService } from "./media";
import {
  createTranslationService,
  getTranslationService,
  hasTranslationService,
} from "./translation";
import { Fields } from "./lib/fields";
import {
  getRakunBootstrapOptions,
  hasRakunBootstrapped,
  setRakunBootstrapOptions,
  type RakunBootstrapOptions,
  type ResolvedRakunBootstrapOptions,
} from "./bootstrapState";
import { setLiteralCatalog } from "./literals/definitions";
import {
  resolveRakunPluginContributions,
  runRakunPluginInitializers,
  assertRakunPluginFieldsDeclared,
} from './plugins'

let initPromise: Promise<void> | null = null;
let initializedPluginIds = new Set<string>()

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

const ensureTranslation = (): void => {
  const bootstrapOptions = getRakunBootstrapOptions();
  const translation = bootstrapOptions?.translation;

  if (!translation) return;

  createTranslationService(translation);
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
    ensureTranslation();

    const db = await getMongoService();
    await runMigrations(db);
    await syncAdminRole(db);

    const shouldSyncRoutes = bootstrapOptions?.syncRoutes;

    if (shouldSyncRoutes !== false) {
      await syncConfiguredRoutes();
    }

    if (!bootstrapOptions) return

    await runRakunPluginInitializers({
      plugins: bootstrapOptions.plugins,
      initializedPluginIds,
      context: {
        db,
        logger: Logger!,
        media: bootstrapOptions.media ? getMediaService() : undefined,
        translation: hasTranslationService()
          ? getTranslationService()
          : undefined,
        options: bootstrapOptions,
      },
    })
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
  const contributions = resolveRakunPluginContributions(options)
  const resolvedOptions: ResolvedRakunBootstrapOptions = {
    ...options,
    ...contributions,
  }

  setRakunBootstrapOptions(resolvedOptions);
  setLiteralCatalog(resolvedOptions.literals);
  initPromise = null;
  initializedPluginIds = new Set()

  const configuredInternalContentTypes = {
    ...internalContentTypes,
    ...resolvedOptions.internalContentTypes,
  };
  assertRakunPluginFieldsDeclared(
    Object.values(configuredInternalContentTypes),
    resolvedOptions.fields,
  )
  applyManagerRoleHooks(configuredInternalContentTypes.ManagerRole);
  applyManagerUserHooks(configuredInternalContentTypes.ManagerUser);
  const routeableContentTypes = new Set(
    resolvedOptions.routes
      .filter((route) => route.hasPage)
      .map((route) => route.contentType),
  );

  for (const ct of Object.values(configuredInternalContentTypes)) {
    if (routeableContentTypes.has(ct.name)) {
      ct.enableDocumentVisibility();
      ct.enableSeoField(Fields.relation(internalContentTypes.Seo, "new"));
    }
    registerInternalContentType(ct, { override: true });
  }

  for (const ct of resolvedOptions.contentTypes) {
    if (routeableContentTypes.has(ct.name)) {
      ct.enableDocumentVisibility();
      ct.enableSeoField(Fields.relation(internalContentTypes.Seo, "new"));
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

export type { RakunBootstrapOptions, ResolvedRakunBootstrapOptions };
export {
  defineRakunPlugin,
  assertRakunPluginFieldsDeclared,
  resolveRakunPluginContributions,
  runRakunPluginInitializers,
  type RakunPluginDefinition,
  type RakunPluginFieldDefinition,
  type RakunPluginInitContext,
  type RakunResolvedPluginContributions,
} from './plugins'
export {
  getContentHookContext,
  runContentHookContext,
} from "./api/hooks/context";
export type {
  ContentHookContext,
  ContentHookContextStorage,
  ContentHookOperation,
  ContentHookRouteContext,
  ContentHookSurface,
  ContentTypeHooks,
} from "./lib/hooks";
export type {
  DynamicBindingSource,
  DynamicDataOptions,
  DynamicDocumentBindings,
  DynamicListBinding,
  DynamicListDocumentSource,
  DynamicListMapSource,
  DynamicQueryCurrentValue,
  DynamicRelatedCollectionSource,
} from "./lib/dynamicData";
export {
  DYNAMIC_BINDINGS_FIELD_NAME,
  DYNAMIC_QUERY_CURRENT_VALUE_KEY,
  DynamicDataOptionsSchema,
  DynamicDocumentBindingsSchema,
  DynamicQueryCurrentValueSchema,
  isDynamicDataSourceContentTypeAllowed,
} from "./lib/dynamicData";
export { getRakunBootstrapOptions } from "./bootstrapState";
export {
  closeDatabase,
  closeMongoService,
  createMongoConnection,
  createMongoService,
  getMongoService,
} from "./orm";
export type { DBMutationOptions, DBService } from "./orm/dbService";
export type { MongoConfig } from "./orm/database";
export {
  default as ContentType,
  DocumentVisibility,
  ModulePicker,
  type ContentTypeMigration,
  type ContentTypeMigrationContext,
  type ModulePicker as ModulePickerMetadata,
  type VersioningOptions,
} from "./lib/ContentType";
export * from "./lib/fields";
export * from "./translation";

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
  type Permission,
} from "./lib/Permissions";
export type { LiteralCatalogInput } from "./literals";
export type { MaybeTranslatableValue, TranslatableValue } from "./lib/types";
export { getListField } from "./lib/utils/getListField";
export { getTranslation } from "./lib/utils/getTranslation";
export { encodeContentTypeForManager } from "./lib/Registry";
export {
  ITERATOR_FIELD_NAME,
  ITERATOR_UNLINKED_FIELD_NAME,
  SEO_FIELD_NAME,
} from "./lib/systemFields";
export {
  LOCALE_VARIANT_GROUP_FIELD,
  LOCALE_VARIANT_ROLE_FIELD,
  LocaleVariantRole,
  getLocaleVariantGroupId,
  getLocaleVariantRole,
  isLocaleVariantDocument,
} from "./lib/localeVariants";
export { Id, isId, type Id as IdType } from "./lib/utils/id";
export { isTranslatableObject } from "./lib/utils/isTranslatableObject";
export { slugify } from "./lib/utils/slugify";
export * from "./api/utils";
export {
  Language,
  ManagerUser,
  Seo,
  SeoSettings,
} from "./internal-content-types";
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
