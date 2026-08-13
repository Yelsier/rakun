import { Logger } from "../../../../lib/Logger";
import { getMediaService } from "../../../../media";

type MediaStorageTarget = {
  key: string;
  previewKey?: string | null;
  sizes?: unknown;
  sources?: unknown;
  access: "public" | "private";
};

/** Seeded Next public assets live under this prefix and must not be deleted. */
const isProtectedStaticMediaKey = (key: string) =>
  key === "public/dynamic-data" || key.startsWith("public/dynamic-data/");

const getRelatedKeys = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (
      item &&
      typeof item === "object" &&
      "key" in item &&
      typeof item.key === "string"
    ) {
      return [item.key];
    }

    return [];
  });
};

export const deleteMediaStorage = async ({
  mediaItems,
  traceName,
}: {
  mediaItems: MediaStorageTarget[];
  traceName: string;
}) => {
  const mediaService = getMediaService();
  Logger.addTrace(`${traceName}: media service ready`);

  let objectCount = 0;
  let skippedProtectedCount = 0;

  for (const media of mediaItems) {
    const keysToDelete = Array.from(
      new Set(
        [
          media.key,
          media.previewKey,
          ...getRelatedKeys(media.sizes),
          ...getRelatedKeys(media.sources),
        ].filter(Boolean),
      ),
    ) as string[];

    for (const key of keysToDelete) {
      if (isProtectedStaticMediaKey(key)) {
        skippedProtectedCount += 1;
        Logger.addTrace(`${traceName}: skipped protected static media key`, {
          key,
        });
        continue;
      }

      await mediaService.rawAdapter.deleteObject({
        key,
        access: media.access,
      });
      objectCount += 1;
    }
  }

  Logger.addTrace(`${traceName}: storage objects deleted`, {
    mediaCount: mediaItems.length,
    objectCount,
    skippedProtectedCount,
  });
};
