import { getRakunBootstrapOptions } from "../../../bootstrapState";
import {
  RouteLocaleVariant,
  RouteMap,
} from "../../../internal-content-types";
import { throwAppError } from "../../../lib/errors";
import type ContentType from "../../../lib/ContentType";
import { getContentPermission } from "../../../lib/Permissions";
import { getContentTypeByName } from "../../../lib/Registry";
import { getTranslation } from "../../../lib/utils/getTranslation";
import {
  getLocaleVariantGroupId,
  getLocaleVariantName,
  getLocaleVariantRole,
  LOCALE_VARIANT_GROUP_FIELD,
  LOCALE_VARIANT_NAME_FIELD,
  LOCALE_VARIANT_ROLE_FIELD,
} from "../../../lib/localeVariants";
import { getMongoService } from "../../../orm";
import type {
  LocaleVariantAssignInput,
  LocaleVariantCreateInput,
  LocaleVariantCreateOutput,
  LocaleVariantListInput,
  LocaleVariantListOutput,
  LocaleVariantMutationOutput,
  LocaleVariantRestoreInput,
  LocaleVariantSetPrimaryInput,
  LocaleVariantTrashInput,
  LocaleVariantUnassignInput,
} from "../../../schemas/manager/localeVariants";
import type { RakunRequestContext } from "../../context";
import { checkPermissions } from "../../utils/checkPermissions";
import { checkOwnership } from "../../utils/checkOwnership";
import { publishLocaleVariantChanges } from '../../utils/realtime'
import { getLanguages } from "../../utils/getLanguages";
import { requireContentType } from "../../utils/requireContentType";
import { routeSignature } from "../../utils/routes/routeDefinitions";
import {
  assertRouteMapEntriesAvailable,
  generateRouteMapItems,
  loadRouteData,
} from "../../utils/routes/routeMapHelpers";
import { updateSingleRouteMap } from "../../utils/routes/updateRoutesMap";
import { checkRevalidatePath } from "../../utils/routes/revalidatePath";
import { prepareLocaleVariantRemoval } from "../../utils/localeVariants";
import {
  getApprovedCurrentReview,
  getDocumentReviewPolicy,
} from "../../utils/reviews";
import { createHandler } from "./create";
import { buildTrashUpdate } from "./trash";

const SYSTEM_CLONE_FIELDS = new Set([
  "_id",
  "_revision",
  "_schemaVersion",
  "_trashed",
  "_visibilityBeforeTrash",
  LOCALE_VARIANT_GROUP_FIELD,
  LOCALE_VARIANT_NAME_FIELD,
  LOCALE_VARIANT_ROLE_FIELD,
  "createdAt",
  "createdBy",
  "trashedAt",
  "trashedBy",
  "updatedAt",
  "updatedBy",
]);

export const getPublishedRoutePath = ({
  documentVisibility,
  document,
  languageId,
  routeMaps,
}: {
  documentVisibility: boolean;
  document: { _id: string; _visibility?: unknown };
  languageId: string;
  routeMaps: Array<{
    contentTypeId: string;
    languageId: string;
    path: string;
  }>;
}) => {
  if (documentVisibility && document._visibility !== "published") {
    return undefined;
  }

  return routeMaps.find(
    (routeMap) =>
      String(routeMap.contentTypeId) === String(document._id) &&
      String(routeMap.languageId) === String(languageId),
  )?.path;
};

export const cloneForLocaleVariant = (
  contentType: ContentType,
  source: Record<string, unknown> & { _id: string },
  name: string,
) => {
  const data = structuredClone(source) as Record<string, unknown>;

  SYSTEM_CLONE_FIELDS.forEach((field) => {
    delete data[field];
  });

  data._type = contentType.name;
  data[LOCALE_VARIANT_GROUP_FIELD] = getLocaleVariantGroupId(source);
  data[LOCALE_VARIANT_NAME_FIELD] = name.trim();
  data[LOCALE_VARIANT_ROLE_FIELD] = "variant";

  return data;
};

export const getRouteForLocaleVariants = async ({
  contentType,
  routeKey,
}: {
  contentType: string;
  routeKey?: string;
}) => {
  const routeDefinitions = getRakunBootstrapOptions()?.routes ?? [];
  const { routes, routeSettings } = await loadRouteData();
  const definition = routeKey
    ? routeDefinitions.find((item) => item.key === routeKey)
    : routeDefinitions.find((item) => item.contentType === contentType && item.hasPage);

  if (!definition || definition.contentType !== contentType || !definition.hasPage) {
    throwAppError("FEATURE_UNSUPPORTED", {
      feature: "localeVariants",
      message: `No page route is configured for ${contentType}`,
    });
  }

  const route = routes.find((item) => routeSignature(item) === routeSignature(definition));

  if (!route || !route.hasPage) {
    throwAppError("FEATURE_UNSUPPORTED", {
      feature: "localeVariants",
      message: `No page route is configured for ${contentType}`,
    });
  }

  return {
    route,
    routeKey: definition.key,
    routes,
    routeSettings,
  };
};

export const requireLanguagesByCode = async (codes: readonly string[]) => {
  const languages = await getLanguages();
  const languageByCode = new Map(languages.map((language) => [language.code, language]));
  const result = codes.map((code) => languageByCode.get(code));
  const missing = codes.filter((code, index) => !result[index]);

  if (missing.length > 0) {
    throwAppError("NOT_FOUND", {
      resource: "Language",
      id: missing.join(", "),
    });
  }

  return {
    languages,
    selected: result.filter((item): item is (typeof languages)[number] => Boolean(item)),
  };
};

const getDocumentLabel = ({
  contentType,
  document,
  languages,
}: {
  contentType: ContentType;
  document: Record<string, unknown>;
  languages: Awaited<ReturnType<typeof getLanguages>>;
}) => {
  const variantName =
    getLocaleVariantRole(document) === "variant"
      ? getLocaleVariantName(document)
      : undefined;
  if (variantName) return variantName;

  const defaultLanguage = languages.find((language) => language.default) ?? languages[0];
  const field = contentType.listFields?.[0] ?? "_id";
  const value = document[field];

  if (defaultLanguage) {
    const translated = getTranslation(value, defaultLanguage, languages);
    if (translated) return String(translated);
  }

  return String(value || document._id || "Untitled");
};

export const buildLocaleVariantList = async ({
  contentType,
  documentId,
  routeKey,
}: LocaleVariantListInput): Promise<LocaleVariantListOutput> => {
  const db = await getMongoService();
  const contentTypeRecord = requireContentType(contentType);
  const current = (await db.get(contentTypeRecord, documentId)) as Record<
    string,
    unknown
  > & { _id: string };
  const { route, routeKey: resolvedRouteKey } = await getRouteForLocaleVariants({
    contentType,
    routeKey,
  });
  const groupId = getLocaleVariantGroupId(current);
  const languages = await getLanguages();
  const assignments = (
    await db.list(RouteLocaleVariant, {
      filter: {
        routeId: route._id,
        groupId,
      },
      options: { limit: "all" },
    })
  ).items;
  const documents = (
    await db.list(contentTypeRecord, {
      filter: {
        $or: [{ _id: groupId }, { [LOCALE_VARIANT_GROUP_FIELD]: groupId }],
      },
      options: { limit: "all" },
    })
  ).items as Array<Record<string, unknown> & { _id: string }>;
  const routeMapsByGroup = await db.list(RouteMap, {
    filter: {
      routeId: route._id,
      variantGroupId: groupId,
    },
    options: { limit: "all", fields: ["contentTypeId", "languageId", "path"] },
  });
  const routeMaps =
    routeMapsByGroup.items.length > 0
      ? routeMapsByGroup.items
      : (
          await db.list(RouteMap, {
            filter: {
              routeId: route._id,
              contentTypeId: { $in: documents.map((document) => document._id) },
            },
            options: {
              limit: "all",
              fields: ["contentTypeId", "languageId", "path"],
            },
          })
        ).items;
  const languageById = new Map(languages.map((language) => [language._id, language]));
  const documentById = new Map(
    documents.map((document) => [String(document._id), document]),
  );
  const assignmentsByDocument = new Map<string, typeof languages>();

  for (const assignment of assignments) {
    const language = languageById.get(assignment.languageId);
    if (!language) continue;

    const currentLanguages = assignmentsByDocument.get(assignment.documentId) ?? [];
    assignmentsByDocument.set(assignment.documentId, [...currentLanguages, language]);
  }

  return {
    routeId: route._id,
    routeKey: resolvedRouteKey,
    contentType,
    groupId,
    primaryDocumentId: groupId,
    currentDocumentId: documentId,
    assignments: assignments
      .map((assignment) => {
        const language = languageById.get(assignment.languageId);
        if (!language) return null;
        const document = documentById.get(String(assignment.documentId));
        const path = document
          ? getPublishedRoutePath({
              documentVisibility: Boolean(contentTypeRecord.documentVisibility),
              document,
              languageId: assignment.languageId,
              routeMaps,
            })
          : undefined;

        return {
          _id: assignment._id,
          routeId: assignment.routeId,
          routeKey: assignment.routeKey,
          contentType: assignment.contentType,
          groupId: assignment.groupId,
          languageId: assignment.languageId,
          language,
          documentId: assignment.documentId,
          ...(path ? { path } : {}),
        };
      })
      .filter((item): item is LocaleVariantListOutput["assignments"][number] =>
        Boolean(item),
      ),
    documents: documents
      .map((document) => ({
        documentId: document._id,
        role: getLocaleVariantRole(document),
        name: getLocaleVariantName(document),
        label: getDocumentLabel({
          contentType: contentTypeRecord,
          document,
          languages,
        }),
        assignedLanguages: assignmentsByDocument.get(document._id) ?? [],
      }))
      .sort((left, right) => {
        if (left.documentId === groupId) return -1;
        if (right.documentId === groupId) return 1;
        return left.label.localeCompare(right.label);
      }),
  };
};

export const assignLocaleVariant = async ({
  contentType,
  documentId,
  routeKey,
  languageCodes,
}: LocaleVariantAssignInput) => {
  const db = await getMongoService();
  const contentTypeRecord = requireContentType(contentType);
  const document = (await db.get(contentTypeRecord, documentId)) as Record<
    string,
    unknown
  > & { _id: string };
  const { route, routeKey: resolvedRouteKey } = await getRouteForLocaleVariants({
    contentType,
    routeKey,
  });
  const { selected } = await requireLanguagesByCode(languageCodes);
  const groupId = getLocaleVariantGroupId(document);

  for (const language of selected) {
    const payload = {
      _type: RouteLocaleVariant.name,
      routeId: route._id,
      routeKey: resolvedRouteKey,
      contentType,
      groupId,
      languageId: language._id,
      documentId,
    };
    const existing = await db.find(RouteLocaleVariant, {
      routeId: route._id,
      groupId,
      languageId: language._id,
    });

    if (existing) {
      await db.update(RouteLocaleVariant, existing._id, payload);
    } else {
      await db.create(RouteLocaleVariant, payload);
    }
  }

  await updateSingleRouteMap({ contentType, contentTypeId: documentId });
  return await buildLocaleVariantList({ contentType, documentId, routeKey });
};

export const assertLocaleVariantRoutesAvailable = async ({
  contentType,
  documentId,
  routeKey,
  languageCodes,
}: LocaleVariantAssignInput) => {
  const db = await getMongoService();
  const contentTypeRecord = requireContentType(contentType);
  const document = (await db.get(
    contentTypeRecord,
    documentId,
  )) as Record<string, unknown> & { _id: string };
  const {
    route,
    routeKey: resolvedRouteKey,
    routes,
    routeSettings,
  } = await getRouteForLocaleVariants({
    contentType,
    routeKey,
  });
  const { languages, selected } =
    await requireLanguagesByCode(languageCodes);
  const groupId = getLocaleVariantGroupId(document);
  const assignments = selected.map((language) => ({
    routeId: route._id,
    routeKey: resolvedRouteKey,
    contentType,
    groupId,
    languageId: language._id,
    documentId,
  }));
  const routesMap = await generateRouteMapItems(
    [{ ...document, _visibility: "published" }],
    route,
    selected,
    routes,
    routeSettings,
    languages,
    assignments,
  );

  await assertRouteMapEntriesAvailable(routesMap);
};

export const listLocaleVariantsHandler = async ({
  input,
  ctx,
}: {
  input: LocaleVariantListInput;
  ctx: RakunRequestContext;
}): Promise<LocaleVariantListOutput> => {
  const contentType = requireContentType(input.contentType);
  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: "readAny",
  });

  return await buildLocaleVariantList(input);
};

export const createLocaleVariantHandler = async ({
  input,
  ctx,
}: {
  input: LocaleVariantCreateInput;
  ctx: RakunRequestContext;
}): Promise<LocaleVariantCreateOutput> => {
  const db = await getMongoService();
  const contentType = requireContentType(input.contentType);
  const user = ctx.getUser();

  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: "readAny",
  });

  const createPermission = getContentPermission(contentType, "own");
  if (createPermission) {
    checkPermissions(user, [createPermission]);
  }

  await getRouteForLocaleVariants({
    contentType: input.contentType,
    routeKey: input.routeKey,
  });

  const source = (await db.get(contentType, input.documentId)) as Record<
    string,
    unknown
  > & { _id: string };
  const created = await createHandler({
    input: {
      contentType: input.contentType,
      data: cloneForLocaleVariant(contentType, source, input.name),
    },
    ctx,
  });
  const createdId = String((created as { _id: string })._id);

  if (input.languageCodes && input.languageCodes.length > 0) {
    await assignLocaleVariant({
      contentType: input.contentType,
      documentId: createdId,
      routeKey: input.routeKey,
      languageCodes: input.languageCodes,
    });
  }

  publishLocaleVariantChanges(input.contentType)

  return {
    document: created as Record<string, unknown>,
    variants: await buildLocaleVariantList({
      contentType: input.contentType,
      documentId: createdId,
      routeKey: input.routeKey,
    }),
  };
};

export const assignLocaleVariantHandler = async ({
  input,
  ctx,
}: {
  input: LocaleVariantAssignInput;
  ctx: RakunRequestContext;
}) => {
  const contentType = requireContentType(input.contentType);
  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: "updateAny",
  });

  const db = await getMongoService();
  const document = (await db.get(contentType, input.documentId)) as Record<
    string,
    unknown
  > & { _id: string };
  if (
    (await getDocumentReviewPolicy({ contentType, document })) &&
    !(await getApprovedCurrentReview({ contentType, document }))
  ) {
    throwAppError("FORBIDDEN", {
      reason: "This version requires an approved review before assigning locales",
    });
  }

  const variants = await assignLocaleVariant(input);
  publishLocaleVariantChanges(input.contentType)
  return variants;
};

export const unassignLocaleVariantHandler = async ({
  input,
  ctx,
}: {
  input: LocaleVariantUnassignInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const contentType = requireContentType(input.contentType);
  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: "updateAny",
  });

  const document = (await db.get(contentType, input.documentId)) as Record<
    string,
    unknown
  > & { _id: string };
  const { route } = await getRouteForLocaleVariants({
    contentType: input.contentType,
    routeKey: input.routeKey,
  });
  const { selected } = await requireLanguagesByCode(input.languageCodes);
  const groupId = getLocaleVariantGroupId(document);

  await Promise.all(
    selected.map((language) =>
      db.delete(RouteLocaleVariant, {
        routeId: route._id,
        groupId,
        languageId: language._id,
        documentId: input.documentId,
      }),
    ),
  );

  await updateSingleRouteMap({
    contentType: input.contentType,
    contentTypeId: input.documentId,
  });

  publishLocaleVariantChanges(input.contentType)

  return await buildLocaleVariantList(input);
};

export const setPrimaryLocaleVariantHandler = async ({
  input,
  ctx,
}: {
  input: LocaleVariantSetPrimaryInput;
  ctx: RakunRequestContext;
}): Promise<LocaleVariantMutationOutput> => {
  const db = await getMongoService();
  const contentType = requireContentType(input.contentType);
  const user = ctx.getUser();
  const target = (await db.get(contentType, input.documentId)) as Record<
    string,
    unknown
  > & { _id: string };

  if (getLocaleVariantRole(target) !== "variant") {
    throwAppError("CONFLICT", {
      key: "LOCALE_VARIANT_ALREADY_PRIMARY",
      message: "This document is already the primary locale variant",
    });
  }
  if (target._trashed === true || target._visibility === "trash") {
    throwAppError("CONFLICT", {
      key: "LOCALE_VARIANT_TRASHED",
      message: "Restore this variant before setting it as primary",
    });
  }

  await getRouteForLocaleVariants(input);
  const previousPrimaryDocumentId = getLocaleVariantGroupId(target);
  const documents = (
    await db.list(contentType, {
      filter: {
        _trashed: { $ne: true },
        $or: [
          { _id: previousPrimaryDocumentId },
          { [LOCALE_VARIANT_GROUP_FIELD]: previousPrimaryDocumentId },
        ],
      },
      options: { limit: "all" },
    })
  ).items as Array<Record<string, unknown> & { _id: string }>;

  for (const document of documents) {
    await checkOwnership({
      ctx,
      contentType,
      id: document._id,
      permission: "updateAny",
    });
  }

  await Promise.all(
    documents.map((document) =>
      db.update(
        contentType,
        document._id,
        {
          [LOCALE_VARIANT_GROUP_FIELD]: input.documentId,
          [LOCALE_VARIANT_ROLE_FIELD]:
            document._id === input.documentId ? "primary" : "variant",
        },
        {
          actorId: user._id,
          reason: "set primary locale variant",
        },
      ),
    ),
  );

  const assignments = (
    await db.list(RouteLocaleVariant, {
      filter: {
        contentType: input.contentType,
        groupId: previousPrimaryDocumentId,
      },
      options: { limit: "all" },
    })
  ).items;
  await Promise.all(
    assignments.map((assignment) =>
      db.update(RouteLocaleVariant, assignment._id, {
        groupId: input.documentId,
      }),
    ),
  );

  await updateSingleRouteMap({
    contentType: input.contentType,
    contentTypeId: input.documentId,
    previousGroupIds: [previousPrimaryDocumentId],
  });

  publishLocaleVariantChanges(input.contentType)

  return { primaryDocumentId: input.documentId };
};

export const trashLocaleVariantHandler = async ({
  input,
  ctx,
}: {
  input: LocaleVariantTrashInput;
  ctx: RakunRequestContext;
}): Promise<LocaleVariantMutationOutput> => {
  const db = await getMongoService();
  const contentType = requireContentType(input.contentType);
  const document = (await db.get(contentType, input.documentId)) as Record<
    string,
    unknown
  > & {
    _id: string;
    _visibility?: string;
    _visibilityBeforeTrash?: string;
  };

  if (getLocaleVariantRole(document) !== "variant") {
    throwAppError("CONFLICT", {
      key: "PRIMARY_LOCALE_VARIANT_REQUIRED",
      message:
        "Set another variant as primary before moving this document to trash",
    });
  }
  if (document._trashed === true || document._visibility === "trash") {
    throwAppError("CONFLICT", {
      key: "LOCALE_VARIANT_ALREADY_TRASHED",
      message: "This locale variant is already in trash",
    });
  }

  await getRouteForLocaleVariants(input);
  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: "deleteAny",
  });

  const dependencies = await db.findDependencies(contentType, input.documentId);
  if (dependencies.length > 0) {
    throwAppError("CONFLICT", {
      message: `Cannot move variant to trash. It is referenced by other items: ${dependencies
        .map((dependency) => `${dependency.contentType} (${dependency._id})`)
        .join(", ")}`,
      key: "DEPENDENCIES_FOUND",
    });
  }

  const primaryDocumentId = getLocaleVariantGroupId(document);
  await prepareLocaleVariantRemoval({
    contentType,
    id: input.documentId,
  });
  const user = ctx.getUser();
  await db.update(
    contentType,
    input.documentId,
    buildTrashUpdate({
      contentType,
      document,
      userId: user._id,
    }),
    {
      actorId: user._id,
      reason: "move locale variant to trash",
    },
  );
  await checkRevalidatePath({
    contentType: input.contentType,
    contentTypeId: primaryDocumentId,
    operation: "update",
  });

  publishLocaleVariantChanges(input.contentType)

  return { primaryDocumentId };
};

export const restoreLocaleVariantHandler = async ({
  input,
  ctx,
}: {
  input: LocaleVariantRestoreInput;
  ctx: RakunRequestContext;
}): Promise<LocaleVariantMutationOutput> => {
  const db = await getMongoService();
  const contentType = requireContentType(input.contentType);
  const document = (await db.get(contentType, input.documentId)) as Record<
    string,
    unknown
  > & {
    _id: string;
    _visibility?: string;
    _visibilityBeforeTrash?: string;
  };

  if (getLocaleVariantRole(document) !== "variant") {
    throwAppError("CONFLICT", {
      key: "PRIMARY_LOCALE_VARIANT_REQUIRED",
      message: "Only secondary locale variants can be restored independently",
    });
  }
  if (document._trashed !== true && document._visibility !== "trash") {
    throwAppError("CONFLICT", {
      key: "LOCALE_VARIANT_NOT_TRASHED",
      message: "This locale variant is not in trash",
    });
  }

  await getRouteForLocaleVariants(input);
  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: "updateAny",
  });

  const primaryDocumentId = getLocaleVariantGroupId(document);
  const visibilityBeforeTrash = document._visibilityBeforeTrash;
  const user = ctx.getUser();
  await db.update(
    contentType,
    input.documentId,
    {
      _trashed: false,
      ...(contentType.documentVisibility
        ? {
            _visibility:
              visibilityBeforeTrash === "draft" ||
              visibilityBeforeTrash === "hidden" ||
              visibilityBeforeTrash === "published"
                ? visibilityBeforeTrash
                : "draft",
          }
        : {}),
    },
    {
      actorId: user._id,
      reason: "restore locale variant from trash",
    },
  );
  await checkRevalidatePath({
    contentType: input.contentType,
    contentTypeId: primaryDocumentId,
    operation: "update",
  });

  publishLocaleVariantChanges(input.contentType)

  return { primaryDocumentId };
};
