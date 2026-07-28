import type { DBService } from "../orm/dbService";
import { ADMIN_ROLE_NAME } from "../lib/ManagerRolePolicy";
import { getPermissionList } from "../lib/Permissions";
import { ManagerRole } from "./ManagerRole";
import { ADMIN_ROLE_SYNC_REASON } from "./ManagerRoleHooks";

export const syncAdminRole = async (db: DBService) => {
  return db.upsert(
    ManagerRole,
    { name: ADMIN_ROLE_NAME },
    {
      name: ADMIN_ROLE_NAME,
      permissions: getPermissionList(),
      _type: ManagerRole.name,
    },
    { reason: ADMIN_ROLE_SYNC_REASON },
  );
};
