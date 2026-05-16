import { Logger } from "../../../../lib/Logger";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import {
  RestoreBackupInput,
  RestoreBackupOutput,
} from "../../../../schemas/manager/backups";
import { checkPermissions } from "../../../utils/checkPermissions";

export const restoreBackupHandler = async ({
  input,
  ctx,
}: {
  input: RestoreBackupInput;
  ctx: RakunRequestContext;
}): Promise<RestoreBackupOutput> => {
  const user = ctx.getUser();
  checkPermissions(user, ["manager.backups.updateAny"]);
  const db = await getMongoService();
  const result = await db.backups.restore({
    ...input,
    actorId: user._id,
  });
  Logger.addTrace("manager.backups.restore: backup restored", {
    backupId: result.backup._id,
    safetyBackupId: result.safetyBackup._id,
    restoredCount: result.restoredCount,
  });
  return result;
};
