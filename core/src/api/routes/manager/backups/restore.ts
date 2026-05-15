import { Logger } from "../../../../lib/Logger";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
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
  const user = ctx.getUser();
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
