import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "mongodb";

import type { DBService } from "./dbService";
import { setSimulatedFailureCase, DbErrorNotFound } from "./dbService";
import { createMongoService, closeDatabase } from "./index";
import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import { createLogger } from "../lib/Logger";
import { registerContentType } from "../lib/Registry";
import { Media } from "../internal-content-types";
import { DataInput } from "../lib/types";

let dbService: DBService;

const RelationCT = new ContentType({
  name: "RelationCT",
  fields: {
    child: Fields.string(),
  },
});

const TestCT = new ContentType({
  name: "Test",
  fields: {
    test: Fields.string().required(),
    relation: Fields.relation(RelationCT),
    test2: Fields.string().translatable(),
  },
});

const DependencyByRelationCT = new ContentType({
  name: "DependencyByRelation",
  fields: {
    title: Fields.string().required(),
    relation: Fields.relation(RelationCT, "existing").translatable(),
  },
});

const DependencyByFileCT = new ContentType({
  name: "DependencyByFile",
  fields: {
    title: Fields.string().required(),
    image: Fields.file().type("Image").translatable(),
  },
});

beforeAll(async () => {
  registerContentType(RelationCT);
  registerContentType(TestCT);
  registerContentType(DependencyByRelationCT);
  registerContentType(DependencyByFileCT);

  createLogger({
    level: "info",
    batchSize: 1000,
    maxQueue: 50000,
    prettify: true,
  });
  dbService = await createMongoService({
    MONGO_URI: "mongodb://localhost:27017/cms_test",
    ENVIRONMENT: "test",
  });
});

afterAll(async () => {
  try {
    await (dbService.rawDB as Db).dropDatabase();
  } catch (error) {
    console.error("Error dropping database:", error);
  }
  await closeDatabase();
});

describe("MongoDB Service", () => {
  it("should connect to the database", () => {
    expect(dbService.rawDB).toBeDefined();
  });

  it("should fail on connect to the database error", async () => {
    setSimulatedFailureCase("ConnectionFailed");

    await expect(
      createMongoService({
        MONGO_URI: "mongodb://localhost:27017/cms_test",
        ENVIRONMENT: "test",
      }),
    ).rejects.toThrow();

    setSimulatedFailureCase(null);
  });

  it("should create document", async () => {
    const created = await dbService.create(TestCT, {
      test: "Hello",
      _type: "Test",
    });
    expect(created).toBeDefined();
    expect(created._id).toBeDefined();
    expect(created.test).toBe("Hello");
  });

  it("should fail on creation error", async () => {
    setSimulatedFailureCase("CreationError");

    await expect(
      dbService.create(TestCT, { test: "Hello", _type: "Test" }),
    ).rejects.toThrow();

    setSimulatedFailureCase(null);
  });

  it("should fail on invalid data", async () => {
    //@ts-expect-error: Testing invalid data type for 'test' field
    await expect(dbService.create(TestCT, { test: 1 })).rejects.toThrow();
  });

  it("should get document", async () => {
    const created = await dbService.create(TestCT, {
      test: "Hello",
      _type: "Test",
    });
    const got = await dbService.get(TestCT, created._id);

    expect(got).toBeDefined();
    expect(got._id).toBe(created._id);
    expect(got.test).toBe("Hello");
  });

  it("should fail on get not found", async () => {
    await expect(
      dbService.get(TestCT, "000000000000000000000000"),
    ).rejects.toThrow(DbErrorNotFound);
  });

  it("should list documents", async () => {
    await dbService.create(TestCT, { test: "Hello", _type: "Test" });
    await dbService.create(TestCT, { test: "World", _type: "Test" });

    const list = await dbService.list(TestCT, { options: { limit: 100 } });

    expect(list.totalItems).toBeGreaterThanOrEqual(2);
    expect(list.items.length).toBeGreaterThanOrEqual(2);
    expect(list.items.find((item) => item.test === "Hello")).toBeDefined();
    expect(list.items.find((item) => item.test === "World")).toBeDefined();
  });

  it("should update document", async () => {
    const created = await dbService.create(TestCT, {
      test: "Hello",
      test2: {
        en: "Hello",
        _tag: "Translatable",
      },
      _type: "Test",
    });
    const updated = await dbService.update(TestCT, created._id, {
      test2: { en: "World", es: "Mundo", _tag: "Translatable" },
    });

    expect(updated).toBeDefined();
    expect(updated._id).toBe(created._id);
    expect(updated.test2).toEqual({
      en: "World",
      es: "Mundo",
      _tag: "Translatable",
    });
  });

  it("should fail on update error", async () => {
    const created = await dbService.create(TestCT, {
      test: "Hello",
      test2: { en: "Hello2", _tag: "Translatable" },
      _type: "Test",
    });

    setSimulatedFailureCase("UpdateError");

    await expect(
      dbService.update(TestCT, created._id, {
        test2: { en: "World", _tag: "Translatable" },
      }),
    ).rejects.toThrow();

    setSimulatedFailureCase(null);
  });

  it("should fail on invalid update data", async () => {
    const created = await dbService.create(TestCT, {
      test: "Hello",
      test2: { en: "Hello2", _tag: "Translatable" },
      _type: "Test",
    });

    await expect(
      //@ts-expect-error: Testing invalid data type for 'test' field
      dbService.update(TestCT, created._id, { test: 1 }),
    ).rejects.toThrow();
  });

  it("should delete document", async () => {
    const created = await dbService.create(TestCT, {
      test: "Hello",
      _type: "Test",
    });
    await dbService.delete(TestCT, { _id: created._id });

    const list = await dbService.list(TestCT, { options: { limit: 100 } });
    expect(list.items.find((item) => item._id === created._id)).toBeUndefined();
  });

  it("should fail on delete error", async () => {
    const created = await dbService.create(TestCT, {
      test: "Hello",
      _type: "Test",
    });

    setSimulatedFailureCase("DeletionError");

    await expect(
      dbService.delete(TestCT, { _id: created._id }),
    ).rejects.toThrow();

    setSimulatedFailureCase(null);
  });

  it("should find dependencies for translatable relation fields", async () => {
    const relation = await dbService.create(RelationCT, {
      child: "child-1",
      _type: "RelationCT",
    });

    const dependency = await dbService.create(DependencyByRelationCT, {
      title: "Dependency relation",
      relation: {
        en: {
          _id: relation._id,
          contentType: "RelationCT",
          type: "existing",
        },
        _tag: "Translatable",
      },
      _type: "DependencyByRelation",
    });

    const dependencies = await dbService.findDependencies(
      RelationCT,
      relation._id,
    );

    expect(
      dependencies.some(
        (dep) =>
          dep.contentType === "DependencyByRelation" &&
          dep._id === dependency._id,
      ),
    ).toBe(true);
  });

  it("should find dependencies for translatable file fields", async () => {
    const media = await dbService.create(Media, {
      name: "test-image",
      originalName: "test-image.jpg",
      key: `test-key-${Date.now()}`,
      access: "public",
      mime: "image/jpeg",
      extension: ".jpg",
      size: 1234,
      status: "uploaded",
      uploadedAt: new Date(),
      _type: "Media",
    });

    const dependency = await dbService.create(DependencyByFileCT, {
      title: "Dependency media",
      image: {
        es: {
          _id: media._id,
          contentType: "Media",
          type: "existing",
        },
        _tag: "Translatable",
      },
      _type: "DependencyByFile",
    });

    const dependencies = await dbService.findDependencies(Media, media._id);

    expect(
      dependencies.some(
        (dep) =>
          dep.contentType === "DependencyByFile" && dep._id === dependency._id,
      ),
    ).toBe(true);
  });
});
