import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import {
  ContentComment,
  ContentCommentReadState,
  ContentReview,
  ContentReviewDecision,
  ManagerNotification,
  Media,
} from "../../../internal-content-types";
import { getMongoService } from "../../../orm";
import { RakunRequestContext } from "../../context";
import { DeleteInput } from "../../../schemas/manager/delete";
import { checkOwnership } from "../../utils/checkOwnership";
import { deleteMediaStorage } from "./media/deleteMediaStorage";
import { requireContentType } from "../../utils/requireContentType";
import { checkRevalidatePath } from "../../utils/routes/revalidatePath";
import { prepareLocaleVariantRemoval } from "../../utils/localeVariants";
import { forbidLinkedIteratorTemplateAccess } from "./linkedIterator";
import {
  getLocaleVariantGroupId,
  getLocaleVariantRole,
  LOCALE_VARIANT_GROUP_FIELD,
} from "../../../lib/localeVariants";
import { isRouteableContentType } from "../../../lib/routeableContent";

export const deleteHandler = async ({
  input,
  ctx,
}: {
  input: DeleteInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const { contentType: contentTypeName, id } = input;
  const contentType = requireContentType(contentTypeName);
  forbidLinkedIteratorTemplateAccess(contentType);

  await checkOwnership({
    ctx,
    contentType,
    id,
    permission: "deleteAny",
  });

  if (contentType.name === "Route") {
    throwAppError("FORBIDDEN", {
      reason:
        "Routes are defined in the API and cannot be deleted from manager",
    });
  }

  const current = isRouteableContentType(contentType.name)
    ? ((await db.get(contentType, id)) as Record<string, unknown> & {
        _id: string;
      })
    : undefined;
  const groupedTrashedVariants =
    current?._trashed === true && getLocaleVariantRole(current) === "primary"
      ? ((
          await db.list(contentType, {
            filter: {
              _trashed: true,
              [LOCALE_VARIANT_GROUP_FIELD]: getLocaleVariantGroupId(current),
            },
            options: { limit: "all", fields: ["_id"] },
          })
        ).items as Array<{ _id: string }>)
      : [];
  const documentIds = [
    id,
    ...groupedTrashedVariants
      .map((document) => document._id)
      .filter((documentId) => documentId !== id),
  ];
  const documentIdSet = new Set(documentIds);
  const documentIdFilter =
    documentIds.length === 1 ? id : ({ $in: documentIds } as const);

  for (const documentId of documentIds.slice(1)) {
    await checkOwnership({
      ctx,
      contentType,
      id: documentId,
      permission: "deleteAny",
    });
  }

  const dependencies = (
    await Promise.all(
      documentIds.map(async (documentId) => ({
        documentId,
        dependencies: await db.findDependencies(contentType, documentId),
      })),
    )
  ).flatMap(({ documentId, dependencies: items }) =>
    items
      .filter(
        (dependency) =>
          dependency.contentType !== contentType.name ||
          !documentIdSet.has(dependency._id),
      )
      .map((dependency) => ({ documentId, dependency })),
  );
  Logger.addTrace("manager.delete: dependencies resolved", {
    count: dependencies.length,
    documents: documentIds.length,
  });

  if (dependencies.length > 0) {
    throwAppError("CONFLICT", {
      message: `Cannot delete item. It is referenced by other items: ${dependencies
        .map(
          ({ documentId, dependency }) =>
            `${dependency.contentType} (${dependency._id}) -> ${documentId}`,
        )
        .join(", ")}`,
      key: "DEPENDENCIES_FOUND",
    });
  }

  if (contentType.name === Media.name) {
    const media = await db.get(Media, id);
    await deleteMediaStorage({
      mediaItems: [media],
      traceName: "manager.delete.media",
    });
  }

  const localeVariantRemoval = await prepareLocaleVariantRemoval({
    contentType,
    id,
  });
  const user = ctx.getUser();
  const reviews = await db.list(ContentReview, {
    filter: {
      contentType: contentType.name,
      documentId: documentIdFilter,
    } as never,
    options: { limit: "all", fields: ["_id"] },
  });

  await db.delete(
    contentType,
    { _id: documentIdFilter } as never,
    { actorId: user._id },
  );
  await db.delete(
    ContentComment,
    {
      contentType: contentType.name,
      documentId: documentIdFilter,
    } as never,
    { actorId: user._id },
  );
  await db.delete(
    ContentCommentReadState,
    {
      contentType: contentType.name,
      documentId: documentIdFilter,
    } as never,
    { actorId: user._id },
  );
  await db.delete(
    ManagerNotification,
    {
      contentType: contentType.name,
      documentId: documentIdFilter,
    } as never,
    { actorId: user._id },
  );
  if (reviews.items.length > 0) {
    await db.delete(
      ContentReviewDecision,
      { reviewId: { $in: reviews.items.map((review) => review._id) } } as never,
      { actorId: user._id },
    );
  }
  await db.delete(
    ContentReview,
    {
      contentType: contentType.name,
      documentId: documentIdFilter,
    } as never,
    { actorId: user._id },
  );
  Logger.addTrace("manager.delete: db delete success", {
    documents: documentIds.length,
  });

  await checkRevalidatePath({
    contentType: contentType.name,
    contentTypeId: localeVariantRemoval.revalidateContentTypeId,
    operation:
      localeVariantRemoval.revalidateContentTypeId === id ? "delete" : "update",
  });

  return { ok: true };
};
