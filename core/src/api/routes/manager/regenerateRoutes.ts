import { regenerateAllRoutesMap } from "../../utils/routes/updateRoutesMap";
import { RakunRequestContext } from "../../context";
import { checkPermissions } from "../../utils/checkPermissions";

export const regenerateRoutesHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext;
}) => {
  const user = ctx.getUser();
  checkPermissions(user, ["content.Route.updateAny"]);

  await regenerateAllRoutesMap();
  return { ok: true };
};
