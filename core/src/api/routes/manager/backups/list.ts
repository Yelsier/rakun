import { Logger } from "../../../../lib/Logger";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { ListBackupsOutput } from "../../../../schemas/manager/backups";

export const listBackupsHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext;
}): Promise<ListBackupsOutput> => {
  ctx.getUser();
  const db = await getMongoService();
  const backups = await db.backups.list();
  Logger.addTrace("manager.backups.list: handler success", {
    backups: backups.length,
  });
  return backups;
};
