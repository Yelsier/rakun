import { ManagerUserSchema } from "../../internal-content-types";
import { throwAppError } from "../../lib/errors";
import { Logger } from "../../lib/Logger";
import {
  hasPermissions,
  mapPermissions,
  Permission,
} from "../../lib/Permissions";

export const checkPermissions = (
  user: ManagerUserSchema,
  permissions: Permission[],
) => {
  const mappedPermissions = mapPermissions(permissions);

  if (!hasPermissions(user, permissions)) {
    throwAppError("FORBIDDEN", {
      reason: `User does not have the required permissions: ${mappedPermissions.join(", ")}`,
    });
  }

  Logger.addTrace("permissions checked", {
    mode: "all",
    permissions: mappedPermissions,
  });
};

export const checkAnyPermissions = (
  user: ManagerUserSchema,
  permissions: Permission[],
) => {
  const mappedPermissions = mapPermissions(permissions);

  if (!permissions.some((permission) => hasPermissions(user, [permission]))) {
    throwAppError("FORBIDDEN", {
      reason: `User does not have any of the required permissions: ${mappedPermissions.join(", ")}`,
    });
  }

  Logger.addTrace("permissions checked", {
    mode: "any",
    permissions: mappedPermissions,
  });
};
