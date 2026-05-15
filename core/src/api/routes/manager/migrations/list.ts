import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { ListMigrationsOutput } from "../../../../schemas/manager/migrations";

export const listMigrationsHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext;
}): Promise<ListMigrationsOutput> => {
  ctx.getUser();
  const db = await getMongoService();
  return db.migrations.list();
};
