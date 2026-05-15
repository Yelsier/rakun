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
  const user = ctx.getUser();
  const db = await getMongoService();
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
  return result;
};
