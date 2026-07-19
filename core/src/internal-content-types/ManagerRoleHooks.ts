import type ContentType from "../lib/ContentType";
import { throwAppError } from "../lib/errors";
import { ADMIN_ROLE_NAME, isAdminRole } from "../lib/ManagerRolePolicy";
import type { Filter } from "../lib/types";
import { ManagerRole } from "./ManagerRole";

export const ADMIN_ROLE_SYNC_REASON = "sync-admin-role";

const throwAdminRoleImmutable = (): never => {
  throwAppError("FORBIDDEN", {
    reason: "The admin role cannot be modified or deleted",
  });
};

export const applyManagerRoleHooks = (
  managerRole: ContentType = ManagerRole,
) => {
  managerRole.withHooks({
    beforeInsert: ({ data, context }) => {
      if (
        context.reason !== ADMIN_ROLE_SYNC_REASON &&
        isAdminRole(data)
      ) {
        throwAdminRoleImmutable();
      }
    },
    beforeUpdate: ({ data, current, context }) => {
      if (
        context.reason !== ADMIN_ROLE_SYNC_REASON &&
        (isAdminRole(current) || isAdminRole(data))
      ) {
        throwAdminRoleImmutable();
      }
    },
    beforeUpdateMany: async ({ filter, data, context }) => {
      if (context.reason === ADMIN_ROLE_SYNC_REASON) return;

      const adminRole = await context.db.find(
        managerRole,
        {
          $and: [filter, { name: ADMIN_ROLE_NAME }],
        } as Filter<typeof managerRole>,
      );

      if (adminRole || isAdminRole(data)) {
        throwAdminRoleImmutable();
      }
    },
    beforeDelete: ({ documents, context }) => {
      if (
        context.reason !== ADMIN_ROLE_SYNC_REASON &&
        documents.some(isAdminRole)
      ) {
        throwAdminRoleImmutable();
      }
    },
  });

  return managerRole;
};
