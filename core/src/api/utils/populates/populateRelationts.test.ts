import { Db } from "mongodb";
import { beforeAll, afterAll, it, expect, describe } from "vitest";
import { Language } from "../../../internal-content-types";
import ContentType from "../../../lib/ContentType";
import { Fields } from "../../../lib/fields";
import { createLogger } from "../../../lib/Logger";
import { registerContentType } from "../../../lib/Registry";
import {
  createMongoService,
  getMongoService,
  closeDatabase,
} from "../../../orm";
import { populateRelations } from "./populateRelations";

describe("populate", async () => {
  const TestCT = new ContentType({
    name: "Test",
    fields: {
      title: Fields.string().required(),
      slug: Fields.string().translatable().required(),
    },
  });

  const Test2CT = new ContentType({
    name: "Test2",
    fields: {
      title: Fields.string().required(),
      slug: Fields.string().translatable().required(),
      relation: Fields.relation(TestCT, "existing"),
    },
  });

  const TestTranslatableRelationCT = new ContentType({
    name: "TestTranslatableRelation",
    fields: {
      title: Fields.string().required(),
      relation: Fields.relation(TestCT, "existing").translatable(),
    },
  });

  registerContentType(TestCT);
  registerContentType(Test2CT);
  registerContentType(TestTranslatableRelationCT);

  beforeAll(async () => {
    createLogger({
      level: "info",
      batchSize: 1000,
      maxQueue: 50000,
      prettify: true,
    });

    process.env.ENVIRONMENT = "test";
    process.env.MONGODB_URI = "mongodb://localhost:27017/cms_test_populates";
    process.env.LOG_LEVEL = "info";
    process.env.BASE_DOMAIN = "localhost";
    process.env.MANAGER_PREFIX = "manager";

    await createMongoService({
      MONGO_URI: process.env.MONGODB_URI!,
      ENVIRONMENT: "test",
    });
  });

  afterAll(async () => {
    const dbService = await getMongoService();
    await (dbService.rawDB as Db).dropDatabase();
    await closeDatabase();
  });

  it("populates", async () => {
    const db = await getMongoService();

    await db.create(Language, {
      code: "en",
      name: "English",
      default: true,
      _type: "Language",
    });

    const test = await db.create(TestCT, {
      _type: "Test",
      title: "Test 1",
      slug: {
        en: "test-1",
        _tag: "Translatable",
      },
    });

    const test2 = await db.create(Test2CT, {
      _type: "Test2",
      title: "Test 2",
      slug: {
        en: "test-2",
        _tag: "Translatable",
      },
      relation: {
        _id: test._id,
        contentType: TestCT.name,
        type: "existing",
      },
    });

    const populated = await populateRelations<typeof Test2CT>(test2);

    Test2CT.getPopulatedSchema().parse(populated);
  });

  it("populates translatable relations", async () => {
    const db = await getMongoService();

    const test = await db.create(TestCT, {
      _type: "Test",
      title: "Translated relation target",
      slug: {
        en: "translated-relation-target",
        _tag: "Translatable",
      },
    });

    const testTranslatable = await db.create(TestTranslatableRelationCT, {
      _type: "TestTranslatableRelation",
      title: "Translated relation source",
      relation: {
        en: {
          _id: test._id,
          contentType: TestCT.name,
          type: "existing",
        },
        _tag: "Translatable",
      },
    });

    const populated =
      await populateRelations<typeof TestTranslatableRelationCT>(
        testTranslatable,
      );

    const relationEn = (
      populated as {
        relation?: { en?: { _id: string; title: string; _type: string } };
      }
    ).relation?.en;

    expect(relationEn?.title).toBe("Translated relation target");
    expect(relationEn?._type).toBe("Test");
    expect(relationEn?._id).toBe(test._id);

    const relation = (populated as { relation?: { en?: { _id: string } } })
      .relation?.en;
    expect(relation?._id).toBe(test._id);
  });
});
