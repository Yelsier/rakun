import { Logger } from "../../../lib/Logger";
import { getContentPermission, hasPermissions } from "../../../lib/Permissions";
import {
  Media,
  RouteLocaleVariant,
} from "../../../internal-content-types";
import { getRakunBootstrapOptions } from "../../../bootstrapState";
import {
  getLocaleVariantGroupId,
  LOCALE_VARIANT_ROLE_FIELD,
} from "../../../lib/localeVariants";
import { getMongoService } from "../../../orm";
import { RakunRequestContext } from "../../context";
import { ListInput } from "../../../schemas/manager/list";
import { checkAnyPermissions } from "../../utils/checkPermissions";
import { populateRelations } from "../../utils/populates/populateRelations";
import { requireContentType } from "../../utils/requireContentType";
import { syncConfiguredRoutes } from "../../utils/routes/syncConfiguredRoutes";
import { parseSafeManagerQuery } from "../../utils/safeManagerQuery";
import { sanitizeManagerOutput } from "../../utils/sanitizeManagerOutput";
import { resolveMediaRecordUrls } from "./media/resolveMediaRecordUrls";
import { forbidLinkedIteratorTemplateAccess } from "./linkedIterator";
import { getLanguages } from "../../utils/getLanguages";

export const listHandler = async ({
  input,
  ctx,
}: {
  input: ListInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const { contentType: contentTypeName } = input;
  const listingTrash = input.query.filter?._trashed === true;
  const contentType = requireContentType(contentTypeName);
  forbidLinkedIteratorTemplateAccess(contentType);
  const query = parseSafeManagerQuery(contentType, input.query);
  const user = ctx.getUser();

  const ownPermission = getContentPermission(contentType, "own");
  const readAnyPermission = getContentPermission(contentType, "readAny");
  const readPermissions = [ownPermission, readAnyPermission].filter(
    (permission): permission is string => Boolean(permission),
  );

  if (readPermissions.length > 0) {
    checkAnyPermissions(user, readPermissions);
  }

  if (
    ownPermission &&
    (!readAnyPermission || !hasPermissions(user, [readAnyPermission]))
  ) {
    Logger.addTrace("manager.list: applying own filter");
    query.filter = {
      ...query.filter,
      createdBy: user._id,
    };
  }

  if (!("_trashed" in (query.filter ?? {}))) {
    query.filter = {
      ...query.filter,
      _trashed: { $ne: true },
    };
  }

  const hasPageRoute =
    getRakunBootstrapOptions()?.routes?.some(
      (route) => route.contentType === contentType.name && route.hasPage,
    ) ?? false;

  if (hasPageRoute && !(LOCALE_VARIANT_ROLE_FIELD in (query.filter ?? {}))) {
    query.filter = {
      ...query.filter,
      [LOCALE_VARIANT_ROLE_FIELD]: { $ne: "variant" },
    };
  }

  if (
    contentType.name === "Route" ||
    contentType.name === "RouteLayoutModule" ||
    contentType.name === "RouteLayoutModuleOverride"
  ) {
    await syncConfiguredRoutes();
  }

  const raw = await db.list(contentType, query);
  Logger.addTrace("manager.list: db list success", {
    totalItems: raw.totalItems,
  });
  let rawItems = raw.items;

  if (
    hasPageRoute &&
    input.languageCode &&
    rawItems.length > 0 &&
    !listingTrash
  ) {
    const language = (await getLanguages()).find(
      (item) => item.code === input.languageCode,
    );

    if (language) {
      const groupIds = rawItems.map((item) =>
        getLocaleVariantGroupId(item),
      );
      const assignments = (
        await db.list(RouteLocaleVariant, {
          filter: {
            contentType: contentType.name,
            groupId: { $in: groupIds },
            languageId: language._id,
          },
          options: { limit: "all", sort: { routeKey: "asc" } },
        } as never)
      ).items;
      const documentIdByGroup = new Map<string, string>();

      for (const assignment of assignments) {
        if (!documentIdByGroup.has(assignment.groupId)) {
          documentIdByGroup.set(
            assignment.groupId,
            assignment.documentId,
          );
        }
      }

      const activeDocumentIds = Array.from(
        new Set(
          Array.from(documentIdByGroup.values()).filter(
            (documentId) =>
              !rawItems.some((item) => item._id === documentId),
          ),
        ),
      );

      if (activeDocumentIds.length > 0) {
        const activeDocuments = (
          await db.list(contentType, {
            filter: {
              _id: { $in: activeDocumentIds },
              _trashed: { $ne: true },
            },
            options: {
              limit: "all",
              ...(input.query.options?.fields
                ? { fields: input.query.options.fields }
                : {}),
            },
          } as never)
        ).items;
        const activeDocumentById = new Map(
          activeDocuments.map((item) => [item._id, item]),
        );

        rawItems = rawItems.map((item) => {
          const groupId = getLocaleVariantGroupId(item);
          const activeDocumentId = documentIdByGroup.get(groupId);
          return activeDocumentId
            ? activeDocumentById.get(activeDocumentId) ?? item
            : item;
        });
      }
    }
  }

  const items = (await Promise.all(
    rawItems.map(async (item) => {
      const populated = await populateRelations(item, {
        exposePrivateMedia: true,
      });

      return typeof item.createdBy === "string"
        ? { ...populated, createdBy: item.createdBy }
        : populated;
    }),
  )) as {
    [x: string]: unknown;
    _id: string;
  }[];
  const resolvedItems =
    contentType.name === Media.name
      ? await Promise.all(items.map((item) => resolveMediaRecordUrls(item)))
      : items;

  return {
    totalItems: raw.totalItems,
    items: sanitizeManagerOutput(resolvedItems, contentType),
  };
};
