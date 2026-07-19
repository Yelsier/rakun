import { beforeEach, describe, expect, it, mock } from "bun:test";

import type { ContentHookContext } from "../lib/hooks";
import type { DBService } from "../orm/dbService";
import { ADMIN_ROLE_NAME } from "../lib/ManagerRolePolicy";
import { getPermissionList } from "../lib/Permissions";
import { ManagerRole } from "./ManagerRole";
import {
  ADMIN_ROLE_SYNC_REASON,
  applyManagerRoleHooks,
} from "./ManagerRoleHooks";
import { syncAdminRole } from "./syncAdminRole";

const createContext = (
  overrides: Partial<ContentHookContext> = {},
): ContentHookContext =>
  ({
    db: {
      find: async () => null,
    },
    rawDB: {},
    contentType: ManagerRole,
    operation: "update",
    surface: "db",
    ...overrides,
  }) as ContentHookContext;

describe("admin manager role", () => {
  beforeEach(() => {
    applyManagerRoleHooks(ManagerRole);
  });

  it("syncs the admin role with every defined permission", async () => {
    const upsert = mock(async () => ({ _id: "admin-role" }));
    const db = { upsert } as unknown as DBService;

    await syncAdminRole(db);

    expect(upsert).toHaveBeenCalledWith(
      ManagerRole,
      { name: ADMIN_ROLE_NAME },
      {
        name: ADMIN_ROLE_NAME,
        permissions: getPermissionList(),
        _type: ManagerRole.name,
      },
      { reason: ADMIN_ROLE_SYNC_REASON },
    );
  });

  it("prevents updating the admin role", () => {
    expect(() =>
      ManagerRole.hooks?.beforeUpdate?.({
        id: "admin-role",
        data: { permissions: [] },
        current: { name: ADMIN_ROLE_NAME },
        context: createContext(),
      }),
    ).toThrow("FORBIDDEN");
  });

  it("prevents deleting the admin role", () => {
    expect(() =>
      ManagerRole.hooks?.beforeDelete?.({
        filter: {},
        documents: [{ name: ADMIN_ROLE_NAME }],
        context: createContext({ operation: "delete" }),
      }),
    ).toThrow("FORBIDDEN");
  });

  it("prevents bulk updates that include the admin role", async () => {
    const context = createContext({
      operation: "updateMany",
      db: {
        find: async () => ({ name: ADMIN_ROLE_NAME }),
      } as unknown as DBService,
    });

    await expect(
      ManagerRole.hooks?.beforeUpdateMany?.({
        filter: {},
        data: { permissions: [] },
        context,
      }),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("allows the internal permission synchronization", () => {
    expect(() =>
      ManagerRole.hooks?.beforeUpdate?.({
        id: "admin-role",
        data: { permissions: getPermissionList() },
        current: { name: ADMIN_ROLE_NAME },
        context: createContext({ reason: ADMIN_ROLE_SYNC_REASON }),
      }),
    ).not.toThrow();
  });
});
