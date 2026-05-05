import type { Db } from "mongodb";
import { getContentTypes } from "../lib/Registry";

export async function createIndexes(db: Db): Promise<void> {
  const contentTypes = getContentTypes();

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
