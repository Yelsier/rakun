import { beforeAll, describe, expect, it } from "bun:test";

import {
  ApiOperation,
  Backup,
  ContentVersion,
  Language,
  LiteralTranslation,
  ManagerRole,
  ManagerUser,
  Migration,
  Page,
  Route,
  RouteLayoutModule,
  RouteMap,
  SeoSettings,
} from "../internal-content-types";
import type { ManagerUserSchema } from "../internal-content-types/ManagerUser";
import ContentType from "./ContentType";
import { Fields } from "./fields";
import {
  getPermissionList,
  hasPermissions,
  mapPermissions,
  type Permission,
} from "./Permissions";
import { registerContentType, registerInternalContentType } from "./Registry";

const makeUser = (permissions: Permission[], roleName = "editor") =>
  ({
    role: {
      name: roleName,
      permissions,
    },
  }) as ManagerUserSchema;

describe("permissions", () => {
  beforeAll(() => {
    registerInternalContentType(Route, { override: true });
    registerInternalContentType(RouteLayoutModule, { override: true });
    registerInternalContentType(RouteMap, { override: true });
    registerInternalContentType(Page, { override: true });
    registerInternalContentType(ManagerUser, { override: true });
    registerInternalContentType(ManagerRole, { override: true });
    registerInternalContentType(Language, { override: true });
    registerInternalContentType(SeoSettings, { override: true });
    registerInternalContentType(Backup, { override: true });
    registerInternalContentType(ContentVersion, { override: true });
    registerInternalContentType(LiteralTranslation, { override: true });
    registerInternalContentType(Migration, { override: true });
    registerInternalContentType(ApiOperation, { override: true });
  });

  it("denies unknown manager permissions", () => {
    const user = makeUser([]);

    expect(
      hasPermissions(user, ["manager.backups.restore" as Permission]),
    ).toBe(false);
  });

  it("always grants every defined permission to the admin role", () => {
    const user = makeUser([], "admin");

    expect(
      hasPermissions(user, ["content.ManagerRole.updateAny" as Permission]),
    ).toBe(true);
    expect(
      hasPermissions(user, ["manager.unknown" as Permission]),
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

  it("omits hidden content permissions by default", () => {
    const Hidden = new ContentType({
      name: "PermissionTestHiddenDefault",
      fields: {
        title: Fields.string().required(),
      },
    }).hideFromManager();
    registerContentType(Hidden);

    expect(getPermissionList()).not.toContain(
      "content.PermissionTestHiddenDefault.readAny",
    );
    expect(
      hasPermissions(makeUser([]), [
        "content.PermissionTestHiddenDefault.readAny" as Permission,
      ]),
    ).toBe(false);
  });

  it("keeps page permissions separate from grouped route permissions", () => {
    const user = makeUser(["content.Route.readAny", "content.Route.updateAny"]);

    expect(
      hasPermissions(user, [
        "content.RouteLayoutModule.updateAny" as Permission,
      ]),
    ).toBe(true);
    expect(hasPermissions(user, ["content.Page.readAny" as Permission])).toBe(
      false,
    );
    expect(
      hasPermissions(makeUser(["content.Page.readAny"]), [
        "content.Page.readAny" as Permission,
      ]),
    ).toBe(true);
    expect(hasPermissions(user, ["content.RouteMap.readAny" as Permission])).toBe(
      true,
    );
    expect(
      hasPermissions(user, ["content.RouteMap.updateAny" as Permission]),
    ).toBe(false);
    expect(mapPermissions(["content.RouteLayoutModule.updateAny"])).toEqual([
      "content.Route.updateAny",
    ]);
  });

  it("uses content type permissions for internal manager resources", () => {
    expect(getPermissionList()).toContain("content.Route.readAny");
    expect(getPermissionList()).toContain("content.Page.readAny");
    expect(getPermissionList()).toContain("content.ManagerUser.readAny");
    expect(getPermissionList()).toContain("content.ManagerRole.updateAny");
    expect(getPermissionList()).toContain("content.Language.updateAny");
    expect(getPermissionList()).toContain("content.SeoSettings.readAny");
    expect(getPermissionList()).toContain("content.Backup.updateAny");
    expect(getPermissionList()).toContain("content.ContentVersion.readAny");
    expect(getPermissionList()).toContain(
      "content.LiteralTranslation.updateAny",
    );
    expect(getPermissionList()).toContain("content.Migration.readAny");
    expect(getPermissionList()).toContain("content.ApiOperation.readAny");
    expect(getPermissionList()).toContain("system.eventLog.read");
    expect(getPermissionList()).not.toContain("manager.routes.readAny");
    expect(getPermissionList()).not.toContain("manager.users.readAny");
    expect(getPermissionList()).not.toContain("manager.roles.updateAny");
    expect(getPermissionList()).not.toContain("manager.languages.updateAny");
    expect(getPermissionList()).not.toContain("manager.seo.readAny");
    expect(getPermissionList().some((permission) => permission.startsWith("manager."))).toBe(false);

    const user = makeUser(["content.ManagerRole.updateAny"]);

    expect(
      hasPermissions(user, ["content.ManagerRole.updateAny" as Permission]),
    ).toBe(true);
  });
});
