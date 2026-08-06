import { Media } from "../../../../internal-content-types";
import { setApiSuccessEventData } from "../../../operations/apiEventLog";
import { throwAppError } from "../../../../lib/errors";
import { Logger } from "../../../../lib/Logger";
import type { FileOptimizeOptions } from "../../../../lib/fields/File";
import { getMediaService, type MediaService } from "../../../../media";
import { optimizeImageUpload } from "../../../../media/imageOptimization";
import { getMongoService } from "../../../../orm";
import type {
  ReimportMediaInput,
  ReimportMediaOutput,
} from "../../../../schemas/manager/media/reimportMedia";
import type { RakunRequestContext } from "../../../context";
import { checkOwnership } from "../../../utils/checkOwnership";
import { deleteMediaStorage } from "./deleteMediaStorage";
import { resolveMediaRecordUrls } from "./resolveMediaRecordUrls";

type ReimportedImage = Awaited<ReturnType<typeof optimizeImageUpload>>;

const fileExtension = (fileName: string): string | undefined => {
  const parts = fileName.split(".");
  if (parts.length < 2) return undefined;
  const extension = parts[parts.length - 1]?.trim().toLowerCase();
  return extension || undefined;
};

const cleanupStoredMedia = async (
  media: {
    key: string;
    previewKey?: string;
    sizes?: unknown;
    access: "public" | "private";
  },
) => {
  try {
    await deleteMediaStorage({
      mediaItems: [media],
      traceName: "manager.media.reimport.cleanup",
    });
    return true;
  } catch (error) {
    Logger.error("manager.media.reimport: cleanup failed", {
      key: media.key,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

export const storeReimportedImage = async ({
  mediaService,
  source,
  fileName,
  mime,
  access,
  optimizeOptions,
}: {
  mediaService: MediaService;
  source: Buffer;
  fileName: string;
  mime: string;
  access: "public" | "private";
  optimizeOptions: FileOptimizeOptions;
}): Promise<ReimportedImage> => {
  const prepared = await mediaService.prepareUpload({
    fileName,
    mime,
    size: source.length,
    access,
  });
  const optimized = await optimizeImageUpload({
    buffer: source,
    mime,
    fileName,
    key: prepared.key,
    optimizeOptions,
  });
  const storedKeys: string[] = [];

  try {
    const objects = [
      {
        key: optimized.key,
        mime: optimized.mime,
        content: optimized.content,
      },
      ...(optimized.sizes ?? []),
    ];

    for (const object of objects) {
      await mediaService.rawAdapter.putObject({
        key: object.key,
        access,
        mime: object.mime,
        content: object.content,
      });
      storedKeys.push(object.key);
    }
  } catch (error) {
    await Promise.allSettled(
      storedKeys.map((key) =>
        mediaService.rawAdapter.deleteObject({ key, access }),
      ),
    );
    throw error;
  }

  return optimized;
};

export const reimportMediaHandler = async ({
  input,
  ctx,
}: {
  input: ReimportMediaInput;
  ctx: RakunRequestContext;
}): Promise<ReimportMediaOutput> => {
  const user = ctx.getUser();
  await checkOwnership({
    ctx,
    contentType: Media,
    id: input.id,
    permission: "updateAny",
  });

  const db = await getMongoService();
  const existing = await db.get(Media, input.id);
  if (!existing.mime.startsWith("image/")) {
    throwAppError("VALIDATION", {
      errors: [{ message: "Only image media can be reimported" }],
    });
  }

  const mediaService = getMediaService();
  const sourceUrl = await mediaService.getMediaUrl({
    key: existing.key,
    access: existing.access,
  });
  const sourceResponse = await fetch(sourceUrl.url);
  if (!sourceResponse.ok) {
    throwAppError("NOT_FOUND", {
      resource: "Media",
      id: input.id,
    });
  }

  const source = Buffer.from(await sourceResponse.arrayBuffer());
  if (source.length === 0) {
    throwAppError("VALIDATION", {
      errors: [{ message: "The source media is empty or unreadable" }],
    });
  }

  const optimized = await storeReimportedImage({
    mediaService,
    source,
    fileName: existing.originalName,
    mime: existing.mime,
    access: existing.access,
    optimizeOptions: input.optimizeOptions,
  });
  const sizes = optimized.sizes?.map(({ content: _, ...size }) => size);
  const newStorage = {
    key: optimized.key,
    previewKey: undefined as string | undefined,
    sizes,
    access: existing.access,
  };

  let updated;
  try {
    const finalized = await mediaService.finalizeUpload({
      key: optimized.key,
      access: existing.access,
    });
    updated = await db.update(
      Media,
      input.id,
      {
        originalName: optimized.fileName,
        key: optimized.key,
        access: existing.access,
        mime: optimized.mime,
        extension: fileExtension(optimized.fileName) ?? null,
        size: optimized.size,
        etag: finalized.etag ?? null,
        url: null,
        previewKey: null,
        previewUrl: optimized.preview?.dataUrl ?? null,
        previewMime: optimized.preview?.mime ?? null,
        sizes: sizes?.length ? sizes : null,
        width: optimized.width ?? null,
        height: optimized.height ?? null,
        orientation: optimized.orientation ?? null,
        optimized: optimized.optimized,
        optimizedFormat: optimized.optimizedFormat ?? null,
        optimizationQuality: optimized.optimizationQuality ?? null,
        originalSize: optimized.originalSize,
        uploadedAt: new Date(),
        updatedBy: user._id,
      },
      {
        actorId: user._id,
        reason: "reimport media with current optimization settings",
      },
    );
  } catch (error) {
    await cleanupStoredMedia(newStorage);
    throw error;
  }

  const previousStorageRemoved = await cleanupStoredMedia(existing);
  setApiSuccessEventData(ctx, {
    mediaId: existing._id,
    optimized: optimized.optimized,
    format: input.optimizeOptions.format,
    quality: input.optimizeOptions.quality,
    generatedSizes: sizes?.length ?? 0,
    generatedPreview: Boolean(optimized.preview),
    previousStorageRemoved,
  });
  Logger.addTrace("manager.media.reimport: completed", {
    mediaId: existing._id,
    generatedSizes: sizes?.length ?? 0,
    generatedPreview: Boolean(optimized.preview),
  });

  const outputBase: ReimportMediaOutput = {
    ...updated,
    sizes: sizes?.length ? sizes : undefined,
    folder: updated.folder
      ? {
          type: "existing",
          _id: updated.folder._id,
          contentType: "MediaFolder",
        }
      : undefined,
  };

  return await resolveMediaRecordUrls(outputBase);
};
