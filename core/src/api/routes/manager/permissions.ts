import { getPermissionList } from "../../../lib/Permissions";
import { RakunRequestContext } from "../../context";
import { checkAnyPermissions } from "../../utils/checkPermissions";

export const permissionsHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext;
}) => {
  const user = ctx.getUser();
  checkAnyPermissions(user, ["manager.permissions.readAny", "manager.roles.updateAny"]);

  return getPermissionList();
};
