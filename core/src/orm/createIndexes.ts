import type { Db } from "mongodb";
import { getContentTypes } from "../lib/Registry";

export async function createIndexes(db: Db): Promise<void> {
  const contentTypes = getContentTypes();

  await Promise.all([
    db.collection("_rakun_backups").createIndex({ createdAt: -1 }),
    db
      .collection("_rakun_backup_documents")
      .createIndex({ backupId: 1, contentType: 1 }),
    db
      .collection("_rakun_content_versions")
      .createIndex(
        { contentType: 1, documentId: 1, revision: -1 },
        { unique: true },
      ),
    db
      .collection("_rakun_migrations")
      .createIndex({ contentType: 1, migrationId: 1 }),
    db
      .collection("_rakun_schema_state")
      .createIndex({ contentType: 1 }, { unique: true }),
  ]);

  for (const contentType of contentTypes) {
    if (contentType.uniques && contentType.uniques.length > 0) {
      const indexes = contentType.uniques.map((uniqueFields) => ({
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
