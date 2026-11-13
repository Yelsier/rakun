import type { MediaAccess } from "../../../../media";
import { getMediaService } from "../../../../media";
import { Media } from "../../../../internal-content-types";
import { getMongoService } from "../../../../orm";

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
  const posterUrl = async (): Promise<string | undefined> => {
    if (typeof mediaRecord.posterMediaId !== "string") return undefined;
    try {
      const poster = await (await getMongoService()).get(Media, mediaRecord.posterMediaId);
      if (!poster.mime.startsWith("image/")) return undefined;
      if (access === "public" && poster.access === "private") return undefined;
      return await resolveMediaUrl({ key: poster.key, access: poster.access });
    } catch {
      return undefined;
    }
  };
  const [url, previewUrl, sizes, sources, resolvedPosterUrl] = await Promise.all([
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
    posterUrl(),
  ]);

  return {
    ...mediaRecord,
    url,
    previewUrl,
    sizes,
    sources,
    posterUrl: resolvedPosterUrl,
  };
};
