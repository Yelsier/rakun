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
  return db.backups.list();
};
