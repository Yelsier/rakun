import type { MediaAccess } from "../../../../media";
import { getMediaService } from "../../../../media";

const getMediaAccess = (value: unknown): MediaAccess =>
  value === "private" ? "private" : "public";

const getStoredUrl = (value: unknown): string | undefined =>
  typeof value === "string" && value ? value : undefined;

const resolveMediaUrl = async ({
  key,
  access,
  fallback,
}: {
  key: unknown;
  access: MediaAccess;
  fallback?: string;
}): Promise<string | undefined> => {
  if (fallback?.startsWith("data:")) return fallback;
  if (typeof key !== "string" || !key.trim()) return fallback;

  try {
    const media = getMediaService();
    const resolved = await media.getMediaUrl({
      key,
      access,
    });

    return resolved.url || fallback;
  } catch (_) {
    return fallback;
  }
};

const resolveRelatedMedia = async (
  items: unknown,
  access: MediaAccess,
): Promise<unknown> => {
  if (!Array.isArray(items)) return items;

  return Promise.all(
    items.map(async (item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return item;
      }

      const record = item as Record<string, unknown>;

      return {
        ...record,
        url: await resolveMediaUrl({
          key: record.key,
          access,
          fallback: getStoredUrl(record.url),
        }),
      };
    }),
  );
};

export const resolveMediaRecordUrls = async <T extends Record<string, unknown>>(
  mediaRecord: T,
): Promise<T> => {
  const access = getMediaAccess(mediaRecord.access);
  const [url, previewUrl, sizes, sources] = await Promise.all([
    resolveMediaUrl({
      key: mediaRecord.key,
      access,
      fallback: getStoredUrl(mediaRecord.url),
    }),
    resolveMediaUrl({
      key: mediaRecord.previewKey,
      access,
      fallback: getStoredUrl(mediaRecord.previewUrl),
    }),
    resolveRelatedMedia(mediaRecord.sizes, access),
    resolveRelatedMedia(mediaRecord.sources, access),
  ]);

  return {
    ...mediaRecord,
    url,
    previewUrl,
    sizes,
    sources,
  };
};
