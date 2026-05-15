import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { getContentTypeByName } from "../../../lib/Registry";
import { getMongoService } from "../../../orm";
import { RakunRequestContext } from "../../context";
import { GetInput } from "../../../schemas/manager/get";
import { checkOwnership } from "../../utils/checkOwnership";
import { syncConfiguredRoutes } from "../../utils/routes/syncConfiguredRoutes";

export const getHandler = async ({
  input,
  ctx,
}: {
  input: GetInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const { contentType: contentTypeName, id } = input;
  const contentType = getContentTypeByName(contentTypeName);

  await checkOwnership({
    ctx,
    contentType,
    id,
    permission: "readAny",
  });
  Logger.addTrace("manager.get: ownership checked");

  if (!contentType) {
    throwAppError("NOT_FOUND", {
      resource: "ContentType",
      id: contentTypeName,
    });
  }

  if (contentType.name === "Route") {
    await syncConfiguredRoutes();
  }

  try {
    const item = await db.get(contentType, id);
    Logger.addTrace("manager.get: db get success", { found: !!item });
    return item;
  } catch (_) {
    throwAppError("NOT_FOUND", {
      resource: contentTypeName,
      id,
    });
  }
};
