import { Logger } from "../../../lib/Logger";
import { regenerateAllRoutesMap } from "../../utils/routes/updateRoutesMap";

export const regenerateRoutesHandler = async () => {
  Logger.addTrace("manager.regenerateRoutes: handler start");
  await regenerateAllRoutesMap();
  Logger.addTrace("manager.regenerateRoutes: handler success");
  return { ok: true };
};
