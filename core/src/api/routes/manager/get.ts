import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { getMongoService } from "../../../orm";
import { RakunRequestContext } from "../../context";
import { GetInput } from "../../../schemas/manager/get";
import { checkOwnership } from "../../utils/checkOwnership";
import { requireContentType } from "../../utils/requireContentType";
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
  const contentType = requireContentType(contentTypeName);

  await checkOwnership({
    ctx,
    contentType,
    id,
    permission: "readAny",
  });

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
