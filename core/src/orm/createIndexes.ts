import type { Db } from "mongodb";
import {
  Backup,
  BackupDocument,
  ContentVersion,
  Migration,
  PreviewSnapshot,
  SchemaState,
} from "../internal-content-types";
import { getContentTypes } from "../lib/Registry";
import { getPersistedUniqueGroups } from "../lib/routeableContent";

const LEGACY_INTERNAL_COLLECTIONS = [
  ["_rakun_backups", Backup.name],
  ["_rakun_backup_documents", BackupDocument.name],
  ["_rakun_content_versions", ContentVersion.name],
  ["_rakun_migrations", Migration.name],
  ["_rakun_schema_state", SchemaState.name],
] as const;

async function copyLegacyInternalCollections(db: Db): Promise<void> {
  for (const [legacyName, nextName] of LEGACY_INTERNAL_COLLECTIONS) {
    const nextCount = await db.collection(nextName).estimatedDocumentCount();
    if (nextCount > 0) continue;

    const legacyExists = await db
      .listCollections({ name: legacyName }, { nameOnly: true })
      .hasNext();

    if (!legacyExists) continue;

    const documents = await db.collection(legacyName).find({}).toArray();
    if (documents.length === 0) continue;

    await db.collection(nextName).insertMany(documents, { ordered: false });
  }
}

export async function createIndexes(db: Db): Promise<void> {
  const contentTypes = getContentTypes();

  await copyLegacyInternalCollections(db);

  await Promise.all([
    db.collection(Backup.name).createIndex({ createdAt: -1 }),
    db
      .collection(BackupDocument.name)
      .createIndex({ backupId: 1, contentType: 1 }),
    db
      .collection(ContentVersion.name)
      .createIndex(
        { contentType: 1, documentId: 1, revision: -1 },
        { unique: true },
      ),
    db
      .collection(Migration.name)
      .createIndex({ contentType: 1, migrationId: 1 }),
    db
      .collection(PreviewSnapshot.name)
      .createIndex({ tokenHash: 1 }, { unique: true }),
    db
      .collection(PreviewSnapshot.name)
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db
      .collection(SchemaState.name)
      .createIndex({ contentType: 1 }, { unique: true }),
  ]);

  for (const contentType of contentTypes) {
    if (contentType.uniques && contentType.uniques.length > 0) {
      const persistedUniqueGroups = getPersistedUniqueGroups(
        contentType.name,
        contentType.uniques,
      );
      const skippedUniqueGroups = contentType.uniques.filter(
        (uniqueFields) => !persistedUniqueGroups.includes(uniqueFields),
      );

      for (const uniqueFields of skippedUniqueGroups) {
        try {
          await db
            .collection(contentType.name)
            .dropIndex(`unique_${uniqueFields.join("_")}`);
        } catch {}
      }

      const indexes = persistedUniqueGroups.map((uniqueFields) => ({
        key: uniqueFields.reduce(
          (acc, field) => {
            acc[field] = 1;
            return acc;
          },
          {} as Record<string, 1>,
        ),
        name: `unique_${uniqueFields.join("_")}`,
        unique: true,
      }));

      if (indexes.length > 0) {
        try {
          await db.collection(contentType.name).createIndexes(indexes);
        } catch (error) {
          // If it fails, log but don't fail the application
          console.warn(
            `Failed to create indexes for ${contentType.name}:`,
            error,
          );
        }
      }
    }
  }
}
