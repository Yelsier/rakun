import { Logger } from "../../../../lib/Logger";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { regenerateAllRoutesMap } from "../../../utils/routes/updateRoutesMap";
import {
  RestoreBackupInput,
  RestoreBackupOutput,
} from "../../../../schemas/manager/backups";

export const restoreBackupHandler = async ({
  input,
  ctx,
}: {
  input: RestoreBackupInput;
  ctx: RakunRequestContext;
}): Promise<RestoreBackupOutput> => {
  Logger.addTrace("manager.backups.restore: handler start", {
    backupId: input.backupId,
    hasReason: !!input.reason,
  });
  const user = ctx.getUser();
  Logger.addTrace("manager.backups.restore: user resolved", {
    userId: user._id,
  });
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
  await regenerateAllRoutesMap();
  Logger.addTrace("manager.backups.restore: routes regenerated");
  return result;
};
