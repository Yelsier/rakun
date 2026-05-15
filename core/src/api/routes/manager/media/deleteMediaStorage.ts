import { Logger } from "../../../../lib/Logger";
import { getMediaService } from "../../../../media";

type MediaStorageTarget = {
  key: string;
  previewKey?: string | null;
  access: "public" | "private";
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

  for (const media of mediaItems) {
    const keysToDelete = Array.from(
      new Set([media.key, media.previewKey].filter(Boolean)),
    ) as string[];

    for (const key of keysToDelete) {
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
  });
};
