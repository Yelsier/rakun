import { Logger } from "../../../../lib/Logger";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { ListMigrationsOutput } from "../../../../schemas/manager/migrations";

export const listMigrationsHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext;
}): Promise<ListMigrationsOutput> => {
  Logger.addTrace("manager.migrations.list: handler start");
  ctx.getUser();
  const db = await getMongoService();
  const migrations = await db.migrations.list();
  Logger.addTrace("manager.migrations.list: handler success", {
    states: migrations.states.length,
    migrations: migrations.migrations.length,
    pending: migrations.pending.length,
  });
  return migrations;
};
