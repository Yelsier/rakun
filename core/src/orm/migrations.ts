import type { Db } from "mongodb";

import { Migration, MigrationLock, SchemaState } from "../internal-content-types";
import type ContentType from "../lib/ContentType";
import { Logger } from "../lib/Logger";
import { getContentTypes } from "../lib/Registry";
import type { DBService } from "./dbService";
import { transformObjectIdsToStrings } from "./utils/transformObjectIdsToStrings";

export type MigrationStatus = "running" | "completed" | "failed";

export type MigrationLedgerRecord = {
  _id: string;
  contentType: string;
  migrationId: string;
  from: number;
  to: number;
  description?: string;
  status: MigrationStatus;
  backupId?: string;
  startedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
};

export type MigrationStateRecord = {
  _id: string;
  contentType: string;
  version: number;
  updatedAt: Date;
};

export type PendingMigrationRecord = {
  contentType: string;
  migrationId: string;
  from: number;
  to: number;
  description?: string;
};

export type MigrationOverview = {
  states: MigrationStateRecord[];
  migrations: MigrationLedgerRecord[];
  pending: PendingMigrationRecord[];
};

export interface MigrationAdapter {
  list(): Promise<MigrationOverview>;
}

const MIGRATIONS = Migration.name;
const SCHEMA_STATE = SchemaState.name;
const MIGRATION_LOCK = MigrationLock.name;
const LOCK_ID = "global";
const LOCK_TTL_MS = 15 * 60 * 1000;

const migrationKey = (
  contentType: ContentType,
  migration: { id?: string; from: number; to: number },
) => `${contentType.name}:${migration.id ?? `${migration.from}->${migration.to}`}`;

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const acquireLock = async (db: Db) => {
  const staleBefore = new Date(Date.now() - LOCK_TTL_MS);
  const locks = db.collection<{ _id: string; acquiredAt: Date }>(
    MIGRATION_LOCK,
  );

  Logger.addTrace("migrations.lock: acquiring", {
    lockId: LOCK_ID,
    staleBefore,
  });

  const staleLocks = await locks.deleteMany({
    acquiredAt: { $lt: staleBefore },
  });
  if (staleLocks.deletedCount > 0) {
    Logger.addTrace("migrations.lock: stale locks deleted", {
      deleted: staleLocks.deletedCount,
    });
  }

  try {
    await locks.insertOne({
      _id: LOCK_ID,
      acquiredAt: new Date(),
    });
    Logger.addTrace("migrations.lock: acquired", { lockId: LOCK_ID });
  } catch {
    Logger.addTrace("migrations.lock: already running", { lockId: LOCK_ID });
    throw new Error("Rakun migrations are already running");
  }
};

const releaseLock = async (db: Db) => {
  await db
    .collection<{ _id: string; acquiredAt: Date }>(MIGRATION_LOCK)
    .deleteOne({ _id: LOCK_ID });
  Logger.addTrace("migrations.lock: released", { lockId: LOCK_ID });
};

const getInitialVersion = async (db: Db, contentType: ContentType) => {
  const target = contentType.schemaVersion ?? 1;
  const count = await db.collection(contentType.name).countDocuments({});

  if (count === 0) return target;

  if (contentType.migrations.length === 0) return target;

  return Math.min(...contentType.migrations.map((migration) => migration.from));
};

const getCurrentVersion = async (db: Db, contentType: ContentType) => {
  const state = await db.collection(SCHEMA_STATE).findOne({
    contentType: contentType.name,
  });

  if (typeof state?.version === "number") {
    return state.version;
  }

  return await getInitialVersion(db, contentType);
};

const upsertState = async (
  db: Db,
  contentType: ContentType,
  version: number,
) => {
  await db.collection(SCHEMA_STATE).updateOne(
    { contentType: contentType.name },
    {
      $set: {
        contentType: contentType.name,
        version,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
};

const getPendingMigrations = async (
  db: Db,
): Promise<PendingMigrationRecord[]> => {
  const pending: PendingMigrationRecord[] = [];

  for (const contentType of getContentTypes()) {
    if (!contentType.schemaVersion) continue;

    let current = await getCurrentVersion(db, contentType);

    for (const migration of [...contentType.migrations].sort(
      (left, right) => left.from - right.from,
    )) {
      if (current >= contentType.schemaVersion) break;
      if (migration.from !== current) continue;

      pending.push({
        contentType: contentType.name,
        migrationId: migrationKey(contentType, migration),
        from: migration.from,
        to: migration.to,
        description: migration.description,
      });
      current = migration.to;
    }
  }

  return pending;
};

export const runMigrations = async (dbService: DBService): Promise<void> => {
  const db = dbService.rawDB as Db;
  const contentTypes = getContentTypes().filter(
    (contentType) => contentType.schemaVersion,
  );

  Logger.addTrace("migrations.run: start", {
    contentTypes: contentTypes.map((contentType) => contentType.name),
    contentTypesCount: contentTypes.length,
  });

  if (contentTypes.length === 0) {
    Logger.addTrace("migrations.run: no versioned schemas");
    return;
  }

  await acquireLock(db);

  try {
    for (const contentType of contentTypes) {
      const target = contentType.schemaVersion!;
      let current = await getCurrentVersion(db, contentType);
      Logger.addTrace("migrations.run: content type loaded", {
        contentType: contentType.name,
        current,
        target,
        migrations: contentType.migrations.length,
      });

      if (current > target) {
        Logger.addTrace("migrations.run: database version is newer than code", {
          contentType: contentType.name,
          current,
          target,
        });
        throw new Error(
          `Database schema for ${contentType.name} is at version ${current}, but code targets ${target}`,
        );
      }

      if (current === target) {
        await upsertState(db, contentType, target);
        Logger.addTrace("migrations.run: content type already current", {
          contentType: contentType.name,
          version: target,
        });
        continue;
      }

      const migrations = [...contentType.migrations].sort(
        (left, right) => left.from - right.from,
      );

      while (current < target) {
        const migration = migrations.find((item) => item.from === current);

        if (!migration || migration.to > target) {
          Logger.addTrace("migrations.run: missing migration", {
            contentType: contentType.name,
            current,
            target,
          });
          throw new Error(
            `Missing migration for ${contentType.name}: ${current} -> ${target}`,
          );
        }

        const key = migrationKey(contentType, migration);
        Logger.addTrace("migrations.run: migration resolved", {
          contentType: contentType.name,
          migrationId: key,
          from: migration.from,
          to: migration.to,
        });

        const completed = await db.collection(MIGRATIONS).findOne({
          contentType: contentType.name,
          migrationId: key,
          status: "completed",
        });

        if (completed) {
          current = migration.to;
          await upsertState(db, contentType, current);
          Logger.addTrace("migrations.run: migration already completed", {
            contentType: contentType.name,
            migrationId: key,
            version: current,
          });
          continue;
        }

        Logger.addTrace("migrations.run: creating backup", {
          contentType: contentType.name,
          migrationId: key,
        });
        const backup = await dbService.backups.create({
          reason: `pre-migration: ${key}`,
        });
        Logger.addTrace("migrations.run: backup created", {
          contentType: contentType.name,
          migrationId: key,
          backupId: backup._id,
          documentCount: backup.documentCount,
        });

        const startedAt = new Date();
        const insert = await db.collection(MIGRATIONS).insertOne({
          contentType: contentType.name,
          migrationId: key,
          from: migration.from,
          to: migration.to,
          description: migration.description,
          status: "running" as MigrationStatus,
          backupId: backup._id,
          startedAt,
        });
        Logger.addTrace("migrations.run: ledger marked running", {
          contentType: contentType.name,
          migrationId: key,
          ledgerId: insert.insertedId.toString(),
          backupId: backup._id,
        });

        try {
          Logger.addTrace("migrations.run: migration executing", {
            contentType: contentType.name,
            migrationId: key,
            from: migration.from,
            to: migration.to,
          });
          await migration.migrate({
            db: dbService,
            rawDB: db,
            contentType,
            backupId: backup._id,
          });

          current = migration.to;
          await upsertState(db, contentType, current);
          await db.collection(MIGRATIONS).updateOne(
            { _id: insert.insertedId },
            {
              $set: {
                status: "completed" as MigrationStatus,
                completedAt: new Date(),
              },
            },
          );
          Logger.addTrace("migrations.run: migration completed", {
            contentType: contentType.name,
            migrationId: key,
            version: current,
            ledgerId: insert.insertedId.toString(),
          });
        } catch (error) {
          Logger.addTrace("migrations.run: migration failed", {
            contentType: contentType.name,
            migrationId: key,
            ledgerId: insert.insertedId.toString(),
            error: toErrorMessage(error),
          });
          await db.collection(MIGRATIONS).updateOne(
            { _id: insert.insertedId },
            {
              $set: {
                status: "failed" as MigrationStatus,
                failedAt: new Date(),
                error: toErrorMessage(error),
              },
            },
          );
          throw error;
        }
      }
    }
    Logger.addTrace("migrations.run: completed");
  } finally {
    await releaseLock(db);
  }
};

export const createMongoMigrationAdapter = (db: Db): MigrationAdapter => ({
  list: async () => {
    Logger.addTrace("migrations.list: start");
    const states = transformObjectIdsToStrings(
      await db
        .collection(SCHEMA_STATE)
        .find({})
        .sort({ contentType: 1 })
        .toArray(),
    ) as unknown as MigrationStateRecord[];
    const migrations = transformObjectIdsToStrings(
      await db
        .collection(MIGRATIONS)
        .find({})
        .sort({ startedAt: -1 })
        .toArray(),
    ) as unknown as MigrationLedgerRecord[];
    const pending = await getPendingMigrations(db);

    Logger.addTrace("migrations.list: loaded", {
      states: states.length,
      migrations: migrations.length,
      pending: pending.length,
    });

    return { states, migrations, pending };
  },
});
