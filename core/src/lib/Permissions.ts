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
  ...createContentPermission(`content.Media`),
  ...createContentPermission(`content.Redirect`),
  "manager.literals.readAny",
  "manager.literals.updateAny",
] as const;

export type Permission = (typeof PermissionsList)[number];

export const getPermissionList = () => PermissionsList as unknown as string[];

const managerPermissionMap: Record<string, Permission[]> = {
  "content.ManagerUser.own": ["manager.users.readAny"],
  "content.ManagerRole.own": ["manager.roles.readAny"],
  "content.ManagerRoute.own": ["manager.routes.readAny"],
  "content.Language.own": ["manager.languages.readAny"],
  "content.Language.readAny": ["manager.languages.readAny"],
};

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
    if (!allPermissions.includes(permission)) {
      return true;
    }
  }

  return mappedPermissions.every((permission) => {
    return user.role.permissions.includes(permission);
  });
};
