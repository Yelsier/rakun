export const ADMIN_ROLE_NAME = "admin";

export const isAdminRole = (role: { name?: unknown } | null | undefined) =>
  role?.name === ADMIN_ROLE_NAME;
