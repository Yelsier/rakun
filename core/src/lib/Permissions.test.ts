import { describe, expect, it } from "bun:test";

import type { ManagerUserSchema } from "../internal-content-types/ManagerUser";
import { hasPermissions, mapPermissions, type Permission } from "./Permissions";

const makeUser = (permissions: Permission[]) =>
  ({
    role: {
      permissions,
    },
  }) as ManagerUserSchema;

describe("permissions", () => {
  it("denies unknown manager permissions", () => {
    const user = makeUser([]);

    expect(
      hasPermissions(user, ["manager.backups.restore" as Permission]),
    ).toBe(false);
  });

  it("keeps dynamic content permissions allowed for custom content types", () => {
    const user = makeUser([]);

    expect(
      hasPermissions(user, ["content.Article.readAny" as Permission]),
    ).toBe(true);
  });

  it("maps internal manager content permissions to manager permissions", () => {
    const user = makeUser(["manager.routes.updateAny"]);

    expect(
      hasPermissions(user, ["content.RouteMap.updateAny" as Permission]),
    ).toBe(true);
    expect(mapPermissions(["content.RouteMap.updateAny"])).toEqual([
      "manager.routes.updateAny",
    ]);
  });
});
