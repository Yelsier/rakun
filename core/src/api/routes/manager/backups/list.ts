import { Logger } from "../../../../lib/Logger";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { ListBackupsOutput } from "../../../../schemas/manager/backups";

export const listBackupsHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext;
}): Promise<ListBackupsOutput> => {
  Logger.addTrace("manager.backups.list: handler start");
  ctx.getUser();
  const db = await getMongoService();
  Logger.addTrace("manager.backups.list: mongo service ready");
  const backups = await db.backups.list();
  Logger.addTrace("manager.backups.list: handler success", {
    backups: backups.length,
  });
  return backups;
};
