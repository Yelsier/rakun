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
  const user = ctx.getUser();
  const db = await getMongoService();
  const backup = await db.backups.create({
    ...input,
    actorId: user._id,
  });
  return backup;
};
