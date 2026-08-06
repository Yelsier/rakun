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

const resolveSizes = async (
  sizes: unknown,
  access: MediaAccess,
): Promise<unknown> => {
  if (!Array.isArray(sizes)) return sizes;

  return Promise.all(
    sizes.map(async (size) => {
      if (!size || typeof size !== "object" || Array.isArray(size)) {
        return size;
      }

      const sizeRecord = size as Record<string, unknown>;

      return {
        ...sizeRecord,
        url: await resolveMediaUrl({
          key: sizeRecord.key,
          access,
          fallback: getStoredUrl(sizeRecord.url),
        }),
      };
    }),
  );
};

export const resolveMediaRecordUrls = async <
  T extends Record<string, unknown>,
>(
  mediaRecord: T,
): Promise<T> => {
  const access = getMediaAccess(mediaRecord.access);
  const [url, previewUrl, sizes] = await Promise.all([
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
    resolveSizes(mediaRecord.sizes, access),
  ]);

  return {
    ...mediaRecord,
    url,
    previewUrl,
    sizes,
  };
};
