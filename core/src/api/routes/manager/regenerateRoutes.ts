import { regenerateAllRoutesMap } from "../../utils/routes/updateRoutesMap";

export const regenerateRoutesHandler = async () => {
  await regenerateAllRoutesMap();
  return { ok: true };
};
