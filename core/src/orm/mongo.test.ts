import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import type { Db } from "mongodb";

import type { DBService } from "./dbService";
import { setSimulatedFailureCase, DbErrorNotFound } from "./dbService";
import { createMongoService, closeDatabase } from "./index";
import { runMigrations } from "./migrations";
import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import { createLogger } from "../lib/Logger";
import { registerContentType } from "../lib/Registry";
import { Media } from "../internal-content-types";
import { DataInput } from "../lib/types";

let dbService: DBService;
const mongoConfig = {
  MONGO_URI: "mongodb://localhost:27017/cms_test",
  ENVIRONMENT: "test" as const,
};

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

const BackupCT = new ContentType({
  name: "BackupTest",
  fields: {
    title: Fields.string().required(),
  },
});

const VersionedCT = new ContentType({
  name: "VersionedTest",
  fields: {
    title: Fields.string().required(),
  },
}).versioned();

const MigrationCT = new ContentType({
  name: "MigrationTest",
  schemaVersion: 2,
  fields: {
    title: Fields.string().required(),
    slug: Fields.string().required(),
  },
  migrations: [
    {
      from: 1,
      to: 2,
      description: "rename name to title and add slug",
      migrate: async ({ rawDB }) => {
        const db = rawDB as Db;
        await db.collection("MigrationTest").updateMany(
          {},
          {
            $rename: { name: "title" },
            $set: { slug: "migrated" },
          },
        );
      },
    },
  ],
});

describe.serial("MongoDB Service", () => {
  beforeAll(async () => {
    registerContentType(RelationCT);
    registerContentType(TestCT);
    registerContentType(DependencyByRelationCT);
    registerContentType(DependencyByFileCT);
    registerContentType(BackupCT);
    registerContentType(VersionedCT);
    registerContentType(MigrationCT);

    createLogger({
      level: "error",
      batchSize: 1000,
      maxQueue: 50000,
      prettify: true,
    });
    dbService = await createMongoService(mongoConfig);
  });

  afterAll(async () => {
    try {
      await (dbService?.rawDB as Db | undefined)?.dropDatabase();
    } catch (error) {
      console.error("Error dropping database:", error);
    }
    await closeDatabase(mongoConfig);
  });

  it("should connect to the database", () => {
    expect(dbService.rawDB).toBeDefined();
  });

  it("should fail on connect to the database error", async () => {
    await closeDatabase(mongoConfig);
    setSimulatedFailureCase("ConnectionFailed");

    await expect(createMongoService(mongoConfig)).rejects.toThrow();

    setSimulatedFailureCase(null);
    dbService = await createMongoService(mongoConfig);
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

  it("should create and restore document backups", async () => {
    await dbService.clear(BackupCT);
    const created = await dbService.create(BackupCT, {
      title: "before backup",
      _type: "BackupTest",
    });
    const backup = await dbService.backups.create({
      contentTypes: ["BackupTest"],
      reason: "test backup",
    });

    await dbService.update(BackupCT, created._id, {
      title: "after backup",
    });

    const restored = await dbService.backups.restore({
      backupId: backup._id,
      reason: "test restore",
    });
    const got = await dbService.get(BackupCT, created._id);

    expect(restored.restoredCount).toBe(1);
    expect(restored.safetyBackup).toBeDefined();
    expect(got.title).toBe("before backup");
  });

  it("should run content type migrations once with a backup", async () => {
    const rawDB = dbService.rawDB as Db;
    await rawDB.collection("MigrationTest").deleteMany({});
    await rawDB.collection("_rakun_schema_state").deleteMany({
      contentType: "MigrationTest",
    });
    await rawDB.collection("_rakun_migrations").deleteMany({
      contentType: "MigrationTest",
    });
    await rawDB.collection("MigrationTest").insertOne({
      _type: "MigrationTest",
      name: "Old name",
    });

    await runMigrations(dbService);
    await runMigrations(dbService);

    const migrated = await rawDB.collection("MigrationTest").findOne({});
    const ledger = await rawDB
      .collection("_rakun_migrations")
      .find({ contentType: "MigrationTest" })
      .toArray();
    const backups = await dbService.backups.list();

    expect(migrated?.title).toBe("Old name");
    expect(migrated?.slug).toBe("migrated");
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.status).toBe("completed");
    expect(backups.some((backup) => backup.reason?.includes("pre-migration"))).toBe(true);
  });

  it("should store versions and restore an old snapshot", async () => {
    await dbService.clear(VersionedCT);
    const created = await dbService.create(
      VersionedCT,
      {
        title: "Version 1",
        _type: "VersionedTest",
      },
      { actorId: "actor-1" },
    );
    await dbService.update(
      VersionedCT,
      created._id,
      { title: "Version 2" },
      { actorId: "actor-1" },
    );

    const versions = await dbService.versions.list({
      contentType: "VersionedTest",
      documentId: created._id,
    });
    const firstVersion = versions.find((version) => version.revision === 1);

    expect(versions.map((version) => version.operation)).toContain("create");
    expect(versions.map((version) => version.operation)).toContain("update");
    expect(firstVersion).toBeDefined();

    await dbService.versions.restore({
      versionId: firstVersion!._id,
      actorId: "actor-2",
    });
    const restored = await dbService.get(VersionedCT, created._id);
    const restoredVersions = await dbService.versions.list({
      contentType: "VersionedTest",
      documentId: created._id,
    });

    expect(restored.title).toBe("Version 1");
    expect(restoredVersions[0]?.operation).toBe("restore");
  });

});
