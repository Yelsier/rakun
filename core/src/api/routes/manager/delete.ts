import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { Media } from "../../../internal-content-types";
import { getMongoService } from "../../../orm";
import { RakunRequestContext } from "../../context";
import { DeleteInput } from "../../../schemas/manager/delete";
import { checkOwnership } from "../../utils/checkOwnership";
import { deleteMediaStorage } from "./media/deleteMediaStorage";
import { requireContentType } from "../../utils/requireContentType";
import { checkRevalidatePath } from "../../utils/routes/revalidatePath";

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

  const dependencies = await db.findDependencies(contentType, id);
  Logger.addTrace("manager.delete: dependencies resolved", {
    count: dependencies.length,
  });

  if (dependencies.length > 0) {
    throwAppError("CONFLICT", {
      message: `Cannot delete item. It is referenced by other items: ${dependencies
        .map((dep) => `${dep.contentType} (${dep._id})`)
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

  await db.delete(contentType, { _id: id }, { actorId: ctx.getUser()._id });
  Logger.addTrace("manager.delete: db delete success");

  await checkRevalidatePath({
    contentType: contentType.name,
    contentTypeId: id,
    operation: "delete",
  });

  return { ok: true };
};
