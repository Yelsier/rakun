import { ManagerUserSchema } from "../../internal-content-types";
import { throwAppError } from "../../lib/errors";
import {
  hasPermissions,
  mapPermissions,
  Permission,
} from "../../lib/Permissions";

export const checkPermissions = (
  user: ManagerUserSchema,
  permissions: Permission[],
) => {
  if (!hasPermissions(user, permissions)) {
    throwAppError("FORBIDDEN", {
      reason: `User does not have the required permissions: ${mapPermissions(permissions).join(", ")}`,
    });
  }
};

export const checkAnyPermissions = (
  user: ManagerUserSchema,
  permissions: Permission[],
) => {
  if (!permissions.some((permission) => hasPermissions(user, [permission]))) {
    throwAppError("FORBIDDEN", {
      reason: `User does not have any of the required permissions: ${mapPermissions(permissions).join(", ")}`,
    });
  }
};
