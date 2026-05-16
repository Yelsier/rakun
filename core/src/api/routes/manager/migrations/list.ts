import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { ListMigrationsOutput } from "../../../../schemas/manager/migrations";
import { checkPermissions } from "../../../utils/checkPermissions";

export const listMigrationsHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext;
}): Promise<ListMigrationsOutput> => {
  const user = ctx.getUser();
  checkPermissions(user, ["manager.migrations.readAny"]);
  const db = await getMongoService();
  return db.migrations.list();
};
