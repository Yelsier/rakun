import { RouteLocaleVariant } from "../../internal-content-types";
import { getRakunBootstrapOptions } from "../../bootstrapState";
import type ContentType from "../../lib/ContentType";
import { throwAppError } from "../../lib/errors";
import {
  getLocaleVariantGroupId,
  getLocaleVariantRole,
  LOCALE_VARIANT_GROUP_FIELD,
} from "../../lib/localeVariants";
import { getMongoService } from "../../orm";
import { getLanguages } from "./getLanguages";
import { routeSignature } from "./routes/routeDefinitions";
import { syncConfiguredRoutes } from "./routes/syncConfiguredRoutes";

export const initializePrimaryLocaleVariantAssignments = async ({
  contentType,
  document,
}: {
  contentType: ContentType;
  document: Record<string, unknown> & { _id: string };
}): Promise<void> => {
  if (getLocaleVariantRole(document) !== "primary") return;

  const definitions = (getRakunBootstrapOptions()?.routes ?? []).filter(
    (route) => route.contentType === contentType.name && route.hasPage,
  );
  if (definitions.length === 0) return;

  const db = await getMongoService();
  const routes = await syncConfiguredRoutes();
  const languages = await getLanguages();
  const groupId = getLocaleVariantGroupId(document);

  for (const definition of definitions) {
    const route = routes.find(
      (item) => routeSignature(item) === routeSignature(definition),
    );
    if (!route) continue;

    for (const language of languages) {
      const payload = {
        _type: RouteLocaleVariant.name,
        routeId: route._id,
        routeKey: definition.key,
        contentType: contentType.name,
        groupId,
        languageId: language._id,
        documentId: document._id,
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
  }
};

export const prepareLocaleVariantRemoval = async ({
  contentType,
  id,
}: {
  contentType: ContentType;
  id: string;
}): Promise<{ revalidateContentTypeId: string }> => {
  const db = await getMongoService();
  const hasPageRoute =
    getRakunBootstrapOptions()?.routes?.some(
      (route) => route.contentType === contentType.name && route.hasPage,
    ) ?? false;

  if (!hasPageRoute) {
    return { revalidateContentTypeId: id };
  }

  const document = (await db.get(contentType, id)) as Record<string, unknown> & {
    _id: string;
  };
  const groupId = getLocaleVariantGroupId(document);
  const role = getLocaleVariantRole(document);

  if (role === "primary") {
    const variants = (
      await db.list(contentType, {
        filter: {
          _trashed: { $ne: true },
          [LOCALE_VARIANT_GROUP_FIELD]: groupId,
        },
        options: { limit: "all", fields: ["_id"] },
      })
    ).items.filter((item) => item._id !== id);

    if (variants.length > 0) {
      throwAppError("CONFLICT", {
        message:
          "Cannot remove primary locale variant while secondary variants exist.",
        key: "LOCALE_VARIANTS_FOUND",
      });
    }

    await db.delete(RouteLocaleVariant, {
      contentType: contentType.name,
      groupId,
    });
    return { revalidateContentTypeId: id };
  }

  await db.delete(RouteLocaleVariant, {
    contentType: contentType.name,
    documentId: id,
  });

  return { revalidateContentTypeId: groupId };
};
