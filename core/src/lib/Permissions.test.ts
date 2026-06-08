import { describe, expect, it } from "bun:test";

import type { ManagerUserSchema } from "../internal-content-types/ManagerUser";
import ContentType from "./ContentType";
import { Fields } from "./fields";
import {
  getPermissionList,
  hasPermissions,
  mapPermissions,
  type Permission,
} from "./Permissions";
import { registerContentType } from "./Registry";

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

  it("denies unknown content permissions by default", () => {
    const user = makeUser([]);

    expect(
      hasPermissions(user, ["content.Article.readAny" as Permission]),
    ).toBe(false);
  });

  it("maps custom content permissions to grouped resources", () => {
    const Article = new ContentType({
      name: "PermissionTestArticle",
      permissions: {
        resource: "Editorial",
        actions: ["readAny"],
      },
      fields: {
        title: Fields.string().required(),
      },
    });
    registerContentType(Article);

    const user = makeUser(["content.Editorial.readAny"]);

    expect(
      hasPermissions(user, [
        "content.PermissionTestArticle.readAny" as Permission,
      ]),
    ).toBe(true);
    expect(
      hasPermissions(user, [
        "content.PermissionTestArticle.updateAny" as Permission,
      ]),
    ).toBe(false);
    expect(getPermissionList()).toContain("content.Editorial.readAny");
    expect(getPermissionList()).not.toContain("content.Editorial.updateAny");
  });

  it("omits content permissions when permissions are disabled", () => {
    const Hidden = new ContentType({
      name: "PermissionTestHidden",
      permissions: false,
      fields: {
        title: Fields.string().required(),
      },
    });
    registerContentType(Hidden);

    expect(getPermissionList()).not.toContain(
      "content.PermissionTestHidden.readAny",
    );
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
