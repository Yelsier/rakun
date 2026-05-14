import { DeleteInput } from "../../../schemas/manager/delete";
import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { getContentTypeByName } from "../../../lib/Registry";
import { getMongoService } from "../../../orm";
import { RakunRequestContext } from "../../context";
import { checkOwnership } from "../../utils/checkOwnership";
import { checkRevalidatePath } from "../../utils/routes/revalidatePath";

export const trashHandler = async ({
  input,
  ctx,
}: {
  input: DeleteInput;
  ctx: RakunRequestContext;
}) => {
  Logger.addTrace("manager.trash: handler start", {
    contentType: input.contentType,
    id: input.id,
  });
  const db = await getMongoService();
  Logger.addTrace("manager.trash: mongo service ready");
  const { contentType: contentTypeName, id } = input;
  const contentType = getContentTypeByName(contentTypeName);

  if (!contentType) {
    throwAppError("NOT_FOUND", {
      resource: "ContentType",
      id: contentTypeName,
    });
  }

  await checkOwnership({
    ctx,
    contentType,
    id,
    permission: "deleteAny",
  });
  Logger.addTrace("manager.trash: ownership checked");

  if (contentType.name === "Route") {
    throwAppError("FORBIDDEN", {
      reason:
        "Routes are defined in the API and cannot be moved to trash from manager",
    });
  }

  const dependencies = await db.findDependencies(contentType, id);
  Logger.addTrace("manager.trash: dependencies resolved", {
    count: dependencies.length,
  });

  if (dependencies.length > 0) {
    throwAppError("CONFLICT", {
      message: `Cannot move item to trash. It is referenced by other items: ${dependencies
        .map((dep) => `${dep.contentType} (${dep._id})`)
        .join(", ")}`,
      key: "DEPENDENCIES_FOUND",
    });
  }

  const user = ctx.getUser();
  const current = await db.get(contentType, id);
  const currentVisibility =
    (current as { _visibility?: string })._visibility ?? "published";
  const isRestorableVisibility = (
    value: string | undefined,
  ): value is "draft" | "hidden" | "published" =>
    value === "draft" || value === "hidden" || value === "published";
  const visibilityBeforeTrash =
    currentVisibility === "trash"
      ? (current as { _visibilityBeforeTrash?: string })._visibilityBeforeTrash
      : isRestorableVisibility(currentVisibility)
        ? currentVisibility
        : "published";

  await db.update(
    contentType,
    id,
    {
      _trashed: true,
      trashedAt: new Date(),
      trashedBy: user._id,
      ...(contentType.documentVisibility
        ? {
            _visibility: "trash",
            _visibilityBeforeTrash: isRestorableVisibility(visibilityBeforeTrash)
              ? visibilityBeforeTrash
              : "published",
          }
        : {}),
    },
    {
      actorId: user._id,
      reason: "move to trash",
    },
  );
  Logger.addTrace("manager.trash: db trash success");

  await checkRevalidatePath({
    contentType: contentType.name,
    contentTypeId: id,
    operation: "delete",
  });
  Logger.addTrace("manager.trash: revalidate done");

  return { ok: true };
};
