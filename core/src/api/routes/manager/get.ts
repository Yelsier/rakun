import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { Media } from "../../../internal-content-types";
import { getMongoService } from "../../../orm";
import { RakunRequestContext } from "../../context";
import { GetInput } from "../../../schemas/manager/get";
import { checkOwnership } from "../../utils/checkOwnership";
import { requireContentType } from "../../utils/requireContentType";
import { syncConfiguredRoutes } from "../../utils/routes/syncConfiguredRoutes";
import { sanitizeManagerOutput } from "../../utils/sanitizeManagerOutput";
import { resolveMediaRecordUrls } from "./media/resolveMediaRecordUrls";

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
    if (contentType.name === Media.name) {
      return sanitizeManagerOutput(
        await resolveMediaRecordUrls(item as Record<string, unknown>),
        contentType,
      );
    }
    return sanitizeManagerOutput(item, contentType);
  } catch (_) {
    throwAppError("NOT_FOUND", {
      resource: contentTypeName,
      id,
    });
  }
};
