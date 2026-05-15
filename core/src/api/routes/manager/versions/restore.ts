import { Logger } from "../../../../lib/Logger";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { checkRevalidatePath } from "../../../utils/routes/revalidatePath";
import {
  RestoreVersionInput,
  RestoreVersionOutput,
} from "../../../../schemas/manager/versions";

export const restoreVersionHandler = async ({
  input,
  ctx,
}: {
  input: RestoreVersionInput;
  ctx: RakunRequestContext;
}): Promise<RestoreVersionOutput> => {
  Logger.addTrace("manager.versions.restore: handler start", {
    versionId: input.versionId,
    hasReason: !!input.reason,
  });
  const user = ctx.getUser();
  Logger.addTrace("manager.versions.restore: user resolved", {
    userId: user._id,
  });
  const db = await getMongoService();
  Logger.addTrace("manager.versions.restore: mongo service ready");
  const result = await db.versions.restore({
    ...input,
    actorId: user._id,
  });
  Logger.addTrace("manager.versions.restore: version restored", {
    contentType: result.version.contentType,
    documentId: result.version.documentId,
    restoredRevision: result.restored._revision,
  });
  await checkRevalidatePath({
    contentType: result.version.contentType,
    contentTypeId: result.version.documentId,
    operation: "update",
  });
  Logger.addTrace("manager.versions.restore: revalidate done");
  return result;
};
