import { ManagerUserSchema } from "../internal-content-types/ManagerUser";

const createContentPermission = <T extends string>(permission: T) =>
  [
    permission + ".readAny",
    permission + ".own",
    permission + ".updateAny",
    permission + ".deleteAny",
  ] as [`${T}.readAny`, `${T}.own`, `${T}.updateAny`, `${T}.deleteAny`];
const createManagerPermission = <T extends string>(permission: T) =>
  [
    permission + ".readAny",
    permission + ".updateAny",
    permission + ".deleteAny",
  ] as [`${T}.readAny`, `${T}.updateAny`, `${T}.deleteAny`];

export const PermissionsList = [
  ...createManagerPermission("manager.users"),
  ...createManagerPermission("manager.roles"),
  ...createManagerPermission("manager.routes"),
  ...createManagerPermission("manager.languages"),
  ...createManagerPermission("manager.seo"),
  "manager.permissions.readAny",
  "manager.backups.readAny",
  "manager.backups.updateAny",
  "manager.migrations.readAny",
  "manager.versions.readAny",
  "manager.versions.updateAny",
  "manager.apiOperations.readAny",
  ...createContentPermission(`content.Media`),
  ...createContentPermission(`content.Redirect`),
  "manager.literals.readAny",
  "manager.literals.updateAny",
] as const;

export type Permission = (typeof PermissionsList)[number];

export const getPermissionList = () => PermissionsList as unknown as string[];

const managerPermissionMap: Record<string, Permission[]> = {
  "content.ManagerUser.own": ["manager.users.readAny"],
  "content.ManagerUser.readAny": ["manager.users.readAny"],
  "content.ManagerUser.updateAny": ["manager.users.updateAny"],
  "content.ManagerUser.deleteAny": ["manager.users.deleteAny"],
  "content.ManagerRole.own": ["manager.roles.readAny"],
  "content.ManagerRole.readAny": ["manager.roles.readAny"],
  "content.ManagerRole.updateAny": ["manager.roles.updateAny"],
  "content.ManagerRole.deleteAny": ["manager.roles.deleteAny"],
  "content.Route.own": ["manager.routes.readAny"],
  "content.Route.readAny": ["manager.routes.readAny"],
  "content.Route.updateAny": ["manager.routes.updateAny"],
  "content.Route.deleteAny": ["manager.routes.deleteAny"],
  "content.RouteMap.own": ["manager.routes.readAny"],
  "content.RouteMap.readAny": ["manager.routes.readAny"],
  "content.RouteMap.updateAny": ["manager.routes.updateAny"],
  "content.RouteMap.deleteAny": ["manager.routes.deleteAny"],
  "content.RouteLayoutModule.own": ["manager.routes.readAny"],
  "content.RouteLayoutModule.readAny": ["manager.routes.readAny"],
  "content.RouteLayoutModule.updateAny": ["manager.routes.updateAny"],
  "content.RouteLayoutModule.deleteAny": ["manager.routes.deleteAny"],
  "content.RouteLayoutModuleOverride.own": ["manager.routes.readAny"],
  "content.RouteLayoutModuleOverride.readAny": ["manager.routes.readAny"],
  "content.RouteLayoutModuleOverride.updateAny": ["manager.routes.updateAny"],
  "content.RouteLayoutModuleOverride.deleteAny": ["manager.routes.deleteAny"],
  "content.RouteSettings.own": ["manager.routes.readAny"],
  "content.RouteSettings.readAny": ["manager.routes.readAny"],
  "content.RouteSettings.updateAny": ["manager.routes.updateAny"],
  "content.RouteSettings.deleteAny": ["manager.routes.deleteAny"],
  "content.SeoSettings.own": ["manager.seo.updateAny"],
  "content.SeoSettings.readAny": ["manager.seo.readAny"],
  "content.SeoSettings.updateAny": ["manager.seo.updateAny"],
  "content.SeoSettings.deleteAny": ["manager.seo.deleteAny"],
  "content.ManagerRoute.own": ["manager.routes.readAny"],
  "content.Language.own": ["manager.languages.readAny"],
  "content.Language.readAny": ["manager.languages.readAny"],
  "content.Language.updateAny": ["manager.languages.updateAny"],
  "content.Language.deleteAny": ["manager.languages.deleteAny"],
};

const isKnownPermission = (permission: string) =>
  getPermissionList().includes(permission);

const isDynamicContentPermission = (permission: string) =>
  permission.startsWith("content.") && !permission.startsWith("content.Manager");

export const mapPermissions = (permissions: string[]): Permission[] => {
  return permissions.flatMap((permission) => {
    const mapped = managerPermissionMap[permission];
    return mapped ? mapped : permission;
  }) as Permission[];
};

export const hasPermissions = (
  user: ManagerUserSchema,
  permissions: Permission[],
) => {
  const allPermissions = getPermissionList();

  const mappedPermissions = mapPermissions(permissions);

  for (const permission of mappedPermissions) {
    if (!allPermissions.includes(permission) && !isDynamicContentPermission(permission)) {
      return false;
    }
  }

  return mappedPermissions.every((permission) => {
    if (!isKnownPermission(permission) && isDynamicContentPermission(permission)) {
      return true;
    }

    return user.role.permissions.includes(permission);
  });
};
