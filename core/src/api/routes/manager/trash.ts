import { DeleteInput } from "../../../schemas/manager/delete";
import { getRakunBootstrapOptions } from "../../../bootstrapState";
import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import type ContentType from "../../../lib/ContentType";
import {
  getLocaleVariantGroupId,
  LOCALE_VARIANT_GROUP_FIELD,
} from "../../../lib/localeVariants";
import { getMongoService } from "../../../orm";
import { RakunRequestContext } from "../../context";
import { checkOwnership } from "../../utils/checkOwnership";
import { requireContentType } from "../../utils/requireContentType";
import { checkRevalidatePath } from "../../utils/routes/revalidatePath";
import { publishLocaleVariantChanges } from '../../utils/realtime'
import { forbidContentTemplateAccess } from "./template";

type TrashableDocument = Record<string, unknown> & {
  _id: string;
  _visibility?: string;
  _visibilityBeforeTrash?: string;
};

const isRestorableVisibility = (
  value: string | undefined,
): value is "draft" | "hidden" | "published" =>
  value === "draft" || value === "hidden" || value === "published";

export const buildTrashUpdate = ({
  contentType,
  document,
  userId,
}: {
  contentType: ContentType;
  document: TrashableDocument;
  userId: string;
}) => {
  const currentVisibility = document._visibility ?? "published";
  const visibilityBeforeTrash =
    currentVisibility === "trash"
      ? document._visibilityBeforeTrash
      : isRestorableVisibility(currentVisibility)
        ? currentVisibility
        : "published";

  return {
    _trashed: true,
    trashedAt: new Date(),
    trashedBy: userId,
    ...(contentType.documentVisibility
      ? {
          _visibility: "trash" as const,
          _visibilityBeforeTrash: isRestorableVisibility(visibilityBeforeTrash)
            ? visibilityBeforeTrash
            : ("published" as const),
        }
      : {}),
  };
};

export const trashHandler = async ({
  input,
  ctx,
}: {
  input: DeleteInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const { contentType: contentTypeName, id } = input;
  const contentType = requireContentType(contentTypeName);
  forbidContentTemplateAccess(contentType);

  if (contentType.name === "Route") {
    throwAppError("FORBIDDEN", {
      reason:
        "Routes are defined in the API and cannot be moved to trash from manager",
    });
  }

  const current = (await db.get(contentType, id)) as TrashableDocument;
  const hasPageRoute =
    getRakunBootstrapOptions()?.routes?.some(
      (route) => route.contentType === contentType.name && route.hasPage,
    ) ?? false;
  const groupId = getLocaleVariantGroupId(current);
  const documents = hasPageRoute
    ? ((
        await db.list(contentType, {
          filter: {
            _trashed: { $ne: true },
            $or: [
              { _id: groupId },
              { [LOCALE_VARIANT_GROUP_FIELD]: groupId },
            ],
          },
          options: { limit: "all" },
        })
      ).items as TrashableDocument[])
    : [current];
  const documentIds = new Set(documents.map((document) => document._id));

  for (const document of documents) {
    await checkOwnership({
      ctx,
      contentType,
      id: document._id,
      permission: "deleteAny",
    });
  }

  const dependencies = (
    await Promise.all(
      documents.map(async (document) => ({
        documentId: document._id,
        dependencies: await db.findDependencies(contentType, document._id),
      })),
    )
  ).flatMap(({ documentId, dependencies: items }) =>
    items
      .filter(
        (dependency) =>
          dependency.contentType !== contentType.name ||
          !documentIds.has(dependency._id),
      )
      .map((dependency) => ({ documentId, dependency })),
  );
  Logger.addTrace("manager.trash: dependencies resolved", {
    count: dependencies.length,
    documents: documents.length,
  });

  if (dependencies.length > 0) {
    throwAppError("CONFLICT", {
      message: `Cannot move item to trash. It is referenced by other items: ${dependencies
        .map(
          ({ documentId, dependency }) =>
            `${dependency.contentType} (${dependency._id}) -> ${documentId}`,
        )
        .join(", ")}`,
      key: "DEPENDENCIES_FOUND",
    });
  }

  const user = ctx.getUser();
  await Promise.all(
    documents.map((document) =>
      db.update(
        contentType,
        document._id,
        buildTrashUpdate({
          contentType,
          document,
          userId: user._id,
        }),
        {
          actorId: user._id,
          reason: hasPageRoute
            ? "move locale variant group to trash"
            : "move to trash",
        },
      ),
    ),
  );
  Logger.addTrace("manager.trash: db trash success", {
    documents: documents.length,
  });

  await checkRevalidatePath({
    contentType: contentType.name,
    contentTypeId: hasPageRoute ? groupId : id,
    operation: hasPageRoute ? "update" : "delete",
  });

  if (hasPageRoute) {
    publishLocaleVariantChanges(contentType.name)
  }

  return { ok: true, trashedDocuments: documents.length };
};
