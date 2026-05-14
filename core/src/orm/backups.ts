import type { Db, Document } from "mongodb";

import { Backup, BackupDocument } from "../internal-content-types";
import { Logger } from "../lib/Logger";
import { getContentTypes } from "../lib/Registry";
import { parseId } from "./utils/parseId";
import { transformObjectIdsToStrings } from "./utils/transformObjectIdsToStrings";

export type BackupStatus = "completed" | "failed";

export type BackupRecord = {
  _id: string;
  reason?: string;
  contentTypes: string[];
  createdAt: Date;
  createdBy?: string;
  documentCount: number;
  status: BackupStatus;
  error?: string;
};

export type CreateBackupInput = {
  contentTypes?: string[];
  reason?: string;
  actorId?: string;
};

export type RestoreBackupInput = {
  backupId: string;
  actorId?: string;
  reason?: string;
};

export type RestoreBackupOutput = {
  backup: BackupRecord;
  safetyBackup: BackupRecord;
  restoredCount: number;
};

export interface BackupAdapter {
  create(input?: CreateBackupInput): Promise<BackupRecord>;
  list(): Promise<BackupRecord[]>;
  restore(input: RestoreBackupInput): Promise<RestoreBackupOutput>;
}

const BACKUPS = Backup.name;
const BACKUP_DOCUMENTS = BackupDocument.name;
const BACKUP_EXCLUDED_CONTENT_TYPES = new Set<string>([
  Backup.name,
  BackupDocument.name,
]);

type BackupSnapshotDocument = {
  backupId: string;
  contentType: string;
  documentId: string;
  document: Document;
};

const toBackupRecord = (value: Document | null): BackupRecord | null =>
  value ? (transformObjectIdsToStrings(value) as BackupRecord) : null;

const defaultContentTypes = () =>
  getContentTypes()
    .map((contentType) => contentType.name)
    .filter((name) => !BACKUP_EXCLUDED_CONTENT_TYPES.has(name));

export const createMongoBackupAdapter = (db: Db): BackupAdapter => {
  const create = async (
    input: CreateBackupInput = {},
  ): Promise<BackupRecord> => {
    const contentTypes = input.contentTypes?.length
      ? input.contentTypes
      : defaultContentTypes();
    Logger.addTrace("backups.create: start", {
      contentTypes,
      contentTypesCount: contentTypes.length,
      actorId: input.actorId,
      hasReason: !!input.reason,
    });

    const now = new Date();
    const insert = await db.collection(BACKUPS).insertOne({
      reason: input.reason,
      contentTypes,
      createdAt: now,
      createdBy: input.actorId,
      documentCount: 0,
      status: "completed" as BackupStatus,
    });
    const backupId = insert.insertedId.toString();
    Logger.addTrace("backups.create: record inserted", { backupId });

    let documentCount = 0;

    try {
      for (const contentType of contentTypes) {
        const documents = await db.collection(contentType).find({}).toArray();
        documentCount += documents.length;
        Logger.addTrace("backups.create: content type snapshot loaded", {
          backupId,
          contentType,
          documents: documents.length,
        });

        if (documents.length === 0) continue;

        await db.collection<BackupSnapshotDocument>(BACKUP_DOCUMENTS).insertMany(
          documents.map((document) => ({
            backupId,
            contentType,
            documentId: String(document._id),
            document,
          })),
          { ordered: false },
        );
      }

      await db
        .collection(BACKUPS)
        .updateOne({ _id: insert.insertedId }, { $set: { documentCount } });
      Logger.addTrace("backups.create: completed", {
        backupId,
        documentCount,
      });
    } catch (error) {
      Logger.addTrace("backups.create: failed", {
        backupId,
        error: error instanceof Error ? error.message : String(error),
      });
      await db.collection(BACKUPS).updateOne(
        { _id: insert.insertedId },
        {
          $set: {
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
          },
        },
      );
      throw error;
    }

    const record = toBackupRecord(
      await db.collection(BACKUPS).findOne({ _id: insert.insertedId }),
    );

    if (!record) {
      Logger.addTrace("backups.create: created record reload failed", {
        backupId,
      });
      throw new Error("Backup was created but could not be loaded");
    }

    return record;
  };

  const list = async (): Promise<BackupRecord[]> => {
    Logger.addTrace("backups.list: start");
    const backups = transformObjectIdsToStrings(
      await db.collection(BACKUPS).find({}).sort({ createdAt: -1 }).toArray(),
    ) as unknown as BackupRecord[];
    Logger.addTrace("backups.list: loaded", { backups: backups.length });
    return backups;
  };

  const restore = async (
    input: RestoreBackupInput,
  ): Promise<RestoreBackupOutput> => {
    Logger.addTrace("backups.restore: start", {
      backupId: input.backupId,
      actorId: input.actorId,
      hasReason: !!input.reason,
    });

    const backup = toBackupRecord(
      await db.collection(BACKUPS).findOne({ _id: parseId(input.backupId) }),
    );

    if (!backup) {
      Logger.addTrace("backups.restore: backup not found", {
        backupId: input.backupId,
      });
      throw new Error(`Backup not found: ${input.backupId}`);
    }

    if (backup.status !== "completed") {
      Logger.addTrace("backups.restore: backup not restorable", {
        backupId: input.backupId,
        status: backup.status,
      });
      throw new Error(`Backup is not restorable: ${input.backupId}`);
    }

    Logger.addTrace("backups.restore: source backup loaded", {
      backupId: backup._id,
      contentTypes: backup.contentTypes,
      documentCount: backup.documentCount,
    });

    const safetyBackup = await create({
      contentTypes: backup.contentTypes,
      actorId: input.actorId,
      reason: input.reason
        ? `pre-restore: ${input.reason}`
        : `pre-restore: ${input.backupId}`,
    });
    Logger.addTrace("backups.restore: safety backup created", {
      backupId: backup._id,
      safetyBackupId: safetyBackup._id,
      documentCount: safetyBackup.documentCount,
    });

    let restoredCount = 0;

    for (const contentType of backup.contentTypes) {
      const snapshots = await db
        .collection<BackupSnapshotDocument>(BACKUP_DOCUMENTS)
        .find({ backupId: input.backupId, contentType })
        .toArray();

      Logger.addTrace("backups.restore: content type snapshots loaded", {
        backupId: backup._id,
        contentType,
        snapshots: snapshots.length,
      });

      await db.collection(contentType).deleteMany({});
      Logger.addTrace("backups.restore: content type cleared", {
        backupId: backup._id,
        contentType,
      });

      if (snapshots.length > 0) {
        await db
          .collection(contentType)
          .insertMany(snapshots.map((snapshot) => snapshot.document));
      }
      Logger.addTrace("backups.restore: content type restored", {
        backupId: backup._id,
        contentType,
        restored: snapshots.length,
      });

      restoredCount += snapshots.length;
    }

    Logger.addTrace("backups.restore: completed", {
      backupId: backup._id,
      safetyBackupId: safetyBackup._id,
      restoredCount,
    });

    return { backup, safetyBackup, restoredCount };
  };

  return { create, list, restore };
};
