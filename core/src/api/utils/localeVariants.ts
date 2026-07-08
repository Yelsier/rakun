import { RouteLocaleVariant } from "../../internal-content-types";
import type ContentType from "../../lib/ContentType";
import { throwAppError } from "../../lib/errors";
import {
  getLocaleVariantGroupId,
  getLocaleVariantRole,
  LOCALE_VARIANT_GROUP_FIELD,
} from "../../lib/localeVariants";
import { getMongoService } from "../../orm";

export const prepareLocaleVariantRemoval = async ({
  contentType,
  id,
}: {
  contentType: ContentType;
  id: string;
}): Promise<{ revalidateContentTypeId: string }> => {
  const db = await getMongoService();
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
