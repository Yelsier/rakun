import type { ManagerUserSchema } from "../internal-content-types/ManagerUser";
import { isAdminRole } from "./ManagerRolePolicy";
import type ContentType from "./ContentType";
import { getContentTypes } from "./Registry";
import { getRakunBootstrapOptions } from "../bootstrapState";
import { EVENT_LOG_READ_PERMISSION } from "../eventLog/types";

type ContentPermissionAction = "own" | "readAny" | "updateAny" | "deleteAny";

const contentPermissionActions: ContentPermissionAction[] = [
  "readAny",
  "own",
  "updateAny",
  "deleteAny",
];

export type Permission = string;

export const REVIEW_POLICY_CONFIGURE_PERMISSION = "review.policy.configure";
export const REVIEW_SELF_APPROVE_PERMISSION = "review.workflow.selfApprove";
export const AUTH_IP_BLOCK_MANAGE_PERMISSION = 'auth.ipBlocks.manage'

const builtInPermissions: Permission[] = [
  REVIEW_POLICY_CONFIGURE_PERMISSION,
  REVIEW_SELF_APPROVE_PERMISSION,
  EVENT_LOG_READ_PERMISSION,
  AUTH_IP_BLOCK_MANAGE_PERMISSION,
];

const getContentPermissionConfig = (contentType: ContentType) => {
  const config = contentType.permissions;

  if (config === false) return null;

  if (typeof config === "string") {
    return {
      resource: config,
      actions: contentPermissionActions,
    };
  }

  if (config && typeof config === "object") {
    return {
      resource: config.resource,
      actions: config.actions?.length
        ? config.actions
        : contentPermissionActions,
    };
  }

  if (contentType.isInternal || contentType.isHiddenFromManager) return null;

  return {
    resource: contentType.name,
    actions: contentPermissionActions,
  };
};

export const getContentPermissionResource = (contentType: ContentType) => {
  const config = getContentPermissionConfig(contentType);
  return config ? `content.${config.resource}` : null;
};

export const getContentPermission = (
  contentType: ContentType,
  action: ContentPermissionAction,
): Permission | null => {
  const config = getContentPermissionConfig(contentType);
  if (!config || !config.actions.includes(action)) return null;
  return `content.${config.resource}.${action}`;
};

const getDynamicContentPermissions = () =>
  getContentTypes().flatMap((contentType) => {
    const config = getContentPermissionConfig(contentType);
    if (!config) return [];

    return config.actions.map(
      (action) => `content.${config.resource}.${action}`,
    );
  });

export const getPermissionList = () =>
  Array.from(
    new Set([
      ...getDynamicContentPermissions(),
      ...builtInPermissions,
      ...(getRakunBootstrapOptions()?.permissions ?? []),
    ]),
  );

const mapContentTypePermission = (permission: string): string[] | null => {
  const match = /^content\.([^.]+)\.(own|readAny|updateAny|deleteAny)$/.exec(
    permission,
  );

  if (!match) return null;

  const [, contentTypeName, action] = match;
  const contentType = getContentTypes().find(
    (item) => item.name === contentTypeName,
  );

  if (!contentType) return [permission];

  const mapped = getContentPermission(
    contentType,
    action as ContentPermissionAction,
  );

  return mapped ? [mapped] : [permission];
};

export const mapPermissions = (permissions: string[]): Permission[] => {
  return permissions.flatMap((permission) => {
    return mapContentTypePermission(permission) ?? permission;
  }) as Permission[];
};

export const hasPermissions = (
  user: ManagerUserSchema,
  permissions: Permission[],
) => {
  const allPermissions = getPermissionList();

  const mappedPermissions = mapPermissions(permissions);
  const userPermissions = mapPermissions(
    user.role.permissions.filter(
      (permission): permission is string => typeof permission === "string",
    ),
  );

  for (const permission of mappedPermissions) {
    if (!allPermissions.includes(permission)) {
      return false;
    }
  }

  if (isAdminRole(user.role)) {
    return true;
  }

  return mappedPermissions.every((permission) => {
    return userPermissions.includes(permission);
  });
};
