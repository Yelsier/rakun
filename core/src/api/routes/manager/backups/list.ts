import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { ListBackupsOutput } from "../../../../schemas/manager/backups";
import { checkPermissions } from "../../../utils/checkPermissions";

export const listBackupsHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext;
}): Promise<ListBackupsOutput> => {
  const user = ctx.getUser();
  checkPermissions(user, ["manager.backups.readAny"]);
  const db = await getMongoService();
  return db.backups.list();
};
