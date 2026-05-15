import { Logger } from "../../../../lib/Logger";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import {
  BackupRecord,
  CreateBackupInput,
} from "../../../../schemas/manager/backups";

export const createBackupHandler = async ({
  input,
  ctx,
}: {
  input: CreateBackupInput;
  ctx: RakunRequestContext;
}): Promise<BackupRecord> => {
  Logger.addTrace("manager.backups.create: handler start", {
    contentTypes: input.contentTypes,
    hasReason: !!input.reason,
  });
  const user = ctx.getUser();
  const db = await getMongoService();
  const backup = await db.backups.create({
    ...input,
    actorId: user._id,
  });
  Logger.addTrace("manager.backups.create: handler success", {
    backupId: backup._id,
    documentCount: backup.documentCount,
  });
  return backup;
};
