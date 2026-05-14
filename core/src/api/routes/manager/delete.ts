import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { getContentTypeByName } from "../../../lib/Registry";
import { getMongoService } from "../../../orm";
import { RakunRequestContext } from "../../context";
import { DeleteInput } from "../../../schemas/manager/delete";
import { checkOwnership } from "../../utils/checkOwnership";
import { checkRevalidatePath } from "../../utils/routes/revalidatePath";

export const deleteHandler = async ({
  input,
  ctx,
}: {
  input: DeleteInput;
  ctx: RakunRequestContext;
}) => {
  Logger.addTrace("manager.delete: handler start", {
    contentType: input.contentType,
    id: input.id,
  });
  const db = await getMongoService();
  Logger.addTrace("manager.delete: mongo service ready");
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
  Logger.addTrace("manager.delete: ownership checked");

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

  await db.delete(contentType, { _id: id }, { actorId: ctx.getUser()._id });
  Logger.addTrace("manager.delete: db delete success");

  await checkRevalidatePath({
    contentType: contentType.name,
    contentTypeId: id,
    operation: "delete",
  });
  Logger.addTrace("manager.delete: revalidate done");

  return { ok: true };
};
