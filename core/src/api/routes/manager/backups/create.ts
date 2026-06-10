import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import {
  BackupRecord,
  CreateBackupInput,
} from "../../../../schemas/manager/backups";
import { checkPermissions } from "../../../utils/checkPermissions";

export const createBackupHandler = async ({
  input,
  ctx,
}: {
  input: CreateBackupInput;
  ctx: RakunRequestContext;
}): Promise<BackupRecord> => {
  const user = ctx.getUser();
  checkPermissions(user, ["content.Backup.updateAny"]);
  const db = await getMongoService();
  return db.backups.create({
    ...input,
    actorId: user._id,
  });
};
