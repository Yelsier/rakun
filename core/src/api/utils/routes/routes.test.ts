import { Db } from "mongodb";
import {
  beforeAll,
  afterAll,
  beforeEach,
  it,
  expect,
  describe,
} from "bun:test";
import {
  RouteSettings,
  RouteMap,
  Route,
  Language,
  RouteLocaleVariant,
} from "../../../internal-content-types";
import { Page } from "../../../internal-content-types/Page";
import { HelloWorld } from "../../../internal-content-types/HelloWorld";
import ContentType from "../../../lib/ContentType";
import { Fields } from "../../../lib/fields";
import { createLogger } from "../../../lib/Logger";
import { registerContentType } from "../../../lib/Registry";
import { ITERATOR_FIELD_NAME } from "../../../lib/systemFields";
import { DBOutput } from "../../../lib/types";

import {
  updateRouteRouteMap,
  updateSingleRouteMap,
  updateLanguageRoutesMap,
} from "./updateRoutesMap";
import { assertRouteMapEntriesAvailable } from "./routeMapHelpers";
import {
  createMongoService,
  getMongoService,
  closeDatabase,
} from "../../../orm";
import type { RakunRequestContext } from "../../context";
import { setDefaultLanguageHandler } from "../../routes/manager/setDefaultLanguage";
import type { DBService } from "../../../orm/dbService";

const mongoConfig = {
  MONGO_URI: "mongodb://localhost:27017/cms_test_routes",
  ENVIRONMENT: "test" as const,
};

const assignRouteLanguages = async ({
  db,
  route,
  routeKey,
  contentType,
  documentId,
  languages,
}: {
  db: DBService;
  route: DBOutput<typeof Route>;
  routeKey: string;
  contentType: string;
  documentId: string;
  languages: readonly DBOutput<typeof Language>[];
}) => {
  await Promise.all(
    languages.map((language) =>
      db.create(RouteLocaleVariant, {
        _type: "RouteLocaleVariant",
        routeId: route._id,
        routeKey,
        contentType,
        groupId: documentId,
        languageId: language._id,
        documentId,
      }),
    ),
  );
};

describe.serial("routes", () => {
  beforeAll(async () => {
    createLogger({
      level: "error",
      batchSize: 1000,
      maxQueue: 50000,
      prettify: true,
    });

    process.env.ENVIRONMENT = "test";
    process.env.MONGODB_URI = mongoConfig.MONGO_URI;
    process.env.LOG_LEVEL = "error";
    process.env.BASE_DOMAIN = "localhost";
    process.env.MANAGER_PREFIX = "manager";

    await createMongoService(mongoConfig);
  });

  afterAll(async () => {
    const dbService = await getMongoService(mongoConfig);
    await (dbService.rawDB as Db).dropDatabase();
    await closeDatabase(mongoConfig);
  });

  beforeEach(async () => {
    const db = await getMongoService(mongoConfig);
    await db.clear(RouteSettings);
    await db.clear(RouteMap);
    await db.clear(Route);
    await db.clear(Language);
    await db.clear(RouteLocaleVariant);
    await db.clear(Page);
  });

  it("generates and updates route maps", async () => {
    const TestCT = new ContentType({
      name: "TestRoute",
      fields: {
        title: Fields.string().required(),
        slug: Fields.string().translatable().required(),
        items: Fields.blocks([
          { name: "name", field: Fields.string().required() },
        ]),
      },
    });

    const Test2CT = new ContentType({
      name: "TestRouteTwo",
      fields: {
        title: Fields.string().required(),
        slug: Fields.string().translatable().required(),
        items: Fields.blocks([
          { name: "name", field: Fields.string().required() },
        ]),
      },
    });

    registerContentType(TestCT);
    registerContentType(Test2CT);

    //@ts-expect-error reasign type
    Route.fields.contentType = Fields.select([
      TestCT.name,
      Test2CT.name,
    ]).required();

    //@ts-expect-error reasign type
    RouteMap.fields.contentType = Fields.select([
      TestCT.name,
      Test2CT.name,
    ]).required();

    const db = await getMongoService(mongoConfig);

    const english = await db.create(Language, {
      code: "en",
      name: "English",
      default: true,
      _type: "Language",
    });

    const routeForTest = await db.create(Route, {
      basePath: { en: "", _tag: "Translatable" },
      contentType: TestCT.name,
      field: "slug",
      hasPage: true,
      dynamic: false,
      _type: "Route",
      layoutContentOrder: 0,
    });

    const created1 = await db.create(TestCT, {
      title: "Test",
      slug: { en: "test", _tag: "Translatable" },
      _type: "TestRoute",
    });

    const created2 = await db.create(TestCT, {
      title: "Test 2",
      slug: { en: "test-2", _tag: "Translatable" },
      _type: "TestRoute",
    });
    await assignRouteLanguages({
      db,
      route: routeForTest,
      routeKey: "test",
      contentType: TestCT.name,
      documentId: created1._id,
      languages: [english],
    });
    await assignRouteLanguages({
      db,
      route: routeForTest,
      routeKey: "test",
      contentType: TestCT.name,
      documentId: created2._id,
      languages: [english],
    });

    await updateRouteRouteMap(
      routeForTest as unknown as DBOutput<typeof Route>,
    );
    await updateSingleRouteMap({
      contentType: TestCT.name,
      contentTypeId: created1._id,
    });
    await updateSingleRouteMap({
      contentType: TestCT.name,
      contentTypeId: created2._id,
    });

    let routeMaps = (await db.list(RouteMap, { options: { limit: "all" } }))
      .items;
    expect(routeMaps.length).toBe(2);
    expect(routeMaps.find((r) => r.path === "/test/")).toBeDefined();
    expect(routeMaps.find((r) => r.path === "/test-2/")).toBeDefined();

    const spanish = await db.create(Language, {
      code: "es",
      name: "Spanish",
      default: false,
      parent: { _id: english._id, type: "self", contentType: "Language" },
      _type: "Language",
    });
    await assignRouteLanguages({
      db,
      route: routeForTest,
      routeKey: "test",
      contentType: TestCT.name,
      documentId: created1._id,
      languages: [spanish],
    });
    await assignRouteLanguages({
      db,
      route: routeForTest,
      routeKey: "test",
      contentType: TestCT.name,
      documentId: created2._id,
      languages: [spanish],
    });

    await updateLanguageRoutesMap(spanish);
    routeMaps = (await db.list(RouteMap, { options: { limit: "all" } })).items;
    expect(routeMaps.length).toBe(4);
    expect(routeMaps.find((r) => r.path === "/es/test/")).toBeDefined();
    expect(routeMaps.find((r) => r.path === "/es/test-2/")).toBeDefined();

    const routeForBlog = await db.create(Route, {
      basePath: { en: "blog", _tag: "Translatable" },
      contentType: Test2CT.name,
      field: "slug",
      hasPage: true,
      dynamic: false,
      _type: "Route",
      layoutContentOrder: 0,
    });

    const createdBlog = await db.create(Test2CT, {
      title: "Blog Test",
      slug: { en: "test", _tag: "Translatable" },
      _type: "TestRouteTwo",
    });
    await assignRouteLanguages({
      db,
      route: routeForBlog,
      routeKey: "blog",
      contentType: Test2CT.name,
      documentId: createdBlog._id,
      languages: [english, spanish],
    });

    await updateRouteRouteMap(
      routeForBlog as unknown as DBOutput<typeof Route>,
    );
    await updateSingleRouteMap({
      contentType: Test2CT.name,
      contentTypeId: createdBlog._id,
    });

    routeMaps = (await db.list(RouteMap, { options: { limit: "all" } })).items;
    expect(routeMaps.length).toBe(6);
    expect(routeMaps.find((r) => r.path === "/blog/test/")).toBeDefined();
    expect(routeMaps.find((r) => r.path === "/es/blog/test/")).toBeDefined();

    // Simulate delete of first TestCT item and cleanup RouteMap entries
    await db.delete(TestCT, { _id: created1._id });
    await db.delete(RouteMap, { contentTypeId: created1._id });

    routeMaps = (await db.list(RouteMap, { options: { limit: "all" } })).items;
    expect(routeMaps.length).toBe(4);
    expect(routeMaps.find((r) => r.path === "/test-2/")).toBeDefined();
    expect(routeMaps.find((r) => r.path === "/es/test-2/")).toBeDefined();
    expect(routeMaps.find((r) => r.path === "/blog/test/")).toBeDefined();
    expect(routeMaps.find((r) => r.path === "/es/blog/test/")).toBeDefined();
  });

  it("detects a route conflict without mutating the existing map", async () => {
    const TestCT = new ContentType({
      name: "RouteConflictPreflight",
      fields: {
        slug: Fields.string().translatable().required(),
      },
    });

    registerContentType(TestCT);

    //@ts-expect-error reasign type
    Route.fields.contentType = Fields.select([TestCT.name]).required();

    //@ts-expect-error reasign type
    RouteMap.fields.contentType = Fields.select([TestCT.name]).required();

    const db = await getMongoService(mongoConfig);
    const english = await db.create(Language, {
      code: "en",
      name: "English",
      default: true,
      _type: "Language",
    });
    const route = await db.create(Route, {
      basePath: { en: "", _tag: "Translatable" },
      contentType: TestCT.name,
      field: "slug",
      hasPage: true,
      dynamic: false,
      _type: "Route",
      layoutContentOrder: 0,
    });
    const published = await db.create(TestCT, {
      slug: { en: "same-path", _tag: "Translatable" },
      _visibility: "published",
      _type: TestCT.name,
    });
    const draft = await db.create(TestCT, {
      slug: { en: "same-path", _tag: "Translatable" },
      _visibility: "draft",
      _type: TestCT.name,
    });
    const existingRouteMap = await db.create(RouteMap, {
      contentTypeId: published._id,
      contentType: TestCT.name,
      variantGroupId: published._id,
      path: "/same-path/",
      routeId: route._id,
      languageId: english._id,
      _type: "RouteMap",
    });

    let conflict: unknown;
    try {
      await assertRouteMapEntriesAvailable([
        {
          contentTypeId: draft._id,
          contentType: TestCT.name,
          variantGroupId: draft._id,
          path: "/same-path/",
          routeId: route._id,
          languageId: english._id,
          _type: "RouteMap",
        },
      ]);
    } catch (error) {
      conflict = error;
    }

    const routeMaps = (
      await db.list(RouteMap, { options: { limit: "all" } })
    ).items;
    const unchangedDraft = await db.get(TestCT, draft._id);

    expect(conflict).toBeInstanceOf(Error);
    expect((conflict as Error).message).toContain("Route path conflict");
    expect(routeMaps).toHaveLength(1);
    expect(routeMaps[0]?._id).toBe(existingRouteMap._id);
    expect(routeMaps[0]?.contentTypeId).toBe(published._id);
    expect(unchangedDraft._visibility).toBe("draft");
  });

  it("regenerates route maps when the default language changes", async () => {
    const TestCT = new ContentType({
      name: "DefaultLanguageRoute",
      fields: {
        title: Fields.string().required(),
        slug: Fields.string().translatable().required(),
      },
    });

    registerContentType(TestCT);

    //@ts-expect-error reasign type
    Route.fields.contentType = Fields.select([TestCT.name]).required();

    //@ts-expect-error reasign type
    RouteMap.fields.contentType = Fields.select([TestCT.name]).required();

    const db = await getMongoService(mongoConfig);

    const english = await db.create(Language, {
      code: "en",
      name: "English",
      default: true,
      _type: "Language",
    });
    const spanish = await db.create(Language, {
      code: "es",
      name: "Spanish",
      default: false,
      parent: { _id: english._id, type: "self", contentType: "Language" },
      _type: "Language",
    });

    const route = await db.create(Route, {
      basePath: { en: "", es: "", _tag: "Translatable" },
      contentType: TestCT.name,
      field: "slug",
      hasPage: true,
      dynamic: false,
      _type: "Route",
      layoutContentOrder: 0,
    });
    const item = await db.create(TestCT, {
      title: "About",
      slug: { en: "about", es: "sobre", _tag: "Translatable" },
      _type: TestCT.name,
    });
    await assignRouteLanguages({
      db,
      route,
      routeKey: "default-language",
      contentType: TestCT.name,
      documentId: item._id,
      languages: [english, spanish],
    });

    await updateRouteRouteMap(route as unknown as DBOutput<typeof Route>);
    await updateSingleRouteMap({
      contentType: TestCT.name,
      contentTypeId: item._id,
    });

    let routeMaps = (await db.list(RouteMap, { options: { limit: "all" } }))
      .items;
    expect(routeMaps.find((r) => r.path === "/about/")).toBeDefined();
    expect(routeMaps.find((r) => r.path === "/es/sobre/")).toBeDefined();

    await setDefaultLanguageHandler({
      input: { language: "es" },
      ctx: {
        getUser: () => ({
          _id: "manager-user",
          _type: "ManagerUser",
          user: "Manager",
          email: "manager@example.com",
          role: {
            _id: "manager-role",
            _type: "ManagerRole",
            name: "Manager",
            permissions: ["content.Language.updateAny"],
          },
          twoFactorEnabled: false,
        }),
      } as RakunRequestContext,
    });

    routeMaps = (await db.list(RouteMap, { options: { limit: "all" } })).items;
    expect(routeMaps.find((r) => r.path === "/en/about/")).toBeDefined();
    expect(routeMaps.find((r) => r.path === "/sobre/")).toBeDefined();
    expect(routeMaps.find((r) => r.path === "/about/")).toBeUndefined();
    expect(routeMaps.find((r) => r.path === "/es/sobre/")).toBeUndefined();
  });

  it("maps the selected home page to the locale root path", async () => {
    //@ts-expect-error reasign type
    Route.fields.contentType = Fields.select([Page.name]).required();

    //@ts-expect-error reasign type
    RouteMap.fields.contentType = Fields.select([Page.name]).required();

    registerContentType(HelloWorld);
    registerContentType(Page);

    const db = await getMongoService(mongoConfig);

    const english = await db.create(Language, {
      code: "en",
      name: "English",
      default: true,
      _type: "Language",
    });

    const routeForPage = await db.create(Route, {
      basePath: { en: "", _tag: "Translatable" },
      contentType: Page.name,
      field: "slug",
      hasPage: true,
      dynamic: false,
      _type: "Route",
      layoutContentOrder: 0,
    });

    const homePage = await db.create(Page, {
      title: { en: "Home", _tag: "Translatable" },
      slug: { en: "home", _tag: "Translatable" },
      [ITERATOR_FIELD_NAME]: [],
      _type: "Page",
    });

    const regularPage = await db.create(Page, {
      title: { en: "About", _tag: "Translatable" },
      slug: { en: "about", _tag: "Translatable" },
      [ITERATOR_FIELD_NAME]: [],
      _type: "Page",
    });
    await assignRouteLanguages({
      db,
      route: routeForPage,
      routeKey: "page",
      contentType: Page.name,
      documentId: homePage._id,
      languages: [english],
    });
    await assignRouteLanguages({
      db,
      route: routeForPage,
      routeKey: "page",
      contentType: Page.name,
      documentId: regularPage._id,
      languages: [english],
    });

    await db.create(RouteSettings, {
      _type: "RouteSettings",
      key: "default",
      homePage: {
        type: "existing",
        _id: homePage._id,
        contentType: "Page",
      },
    });

    await updateRouteRouteMap(
      routeForPage as unknown as DBOutput<typeof Route>,
    );
    await updateSingleRouteMap({
      contentType: Page.name,
      contentTypeId: homePage._id,
    });
    await updateSingleRouteMap({
      contentType: Page.name,
      contentTypeId: regularPage._id,
    });

    const routeMaps = (await db.list(RouteMap, { options: { limit: "all" } }))
      .items;

    expect(routeMaps.find((r) => r.path === "/")).toBeDefined();
    expect(routeMaps.find((r) => r.path === "/home/")).toBeUndefined();
    expect(routeMaps.find((r) => r.path === "/about/")).toBeDefined();
  });
});
