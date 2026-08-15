import { Media } from "../../../../internal-content-types";
import { throwAppError } from "../../../../lib/errors";
import { Logger } from "../../../../lib/Logger";
import {
  MediaError,
  MediaErrorInvalidData,
  MediaErrorNotFound,
  getMediaService,
} from "../../../../media";
import { getMongoService } from "../../../../orm";
import type {
  ReplaceMediaInput,
  ReplaceMediaOutput,
} from "../../../../schemas/manager/media/replaceMedia";
import type { RakunRequestContext } from "../../../context";
import { setApiSuccessEventData } from "../../../operations/apiEventLog";
import { checkOwnership } from "../../../utils/checkOwnership";
import { checkRevalidatePath } from "../../../utils/routes/revalidatePath";
import {
  isCompatibleMediaUploadKey,
  isCompatibleMediaUploadRelatedKey,
} from "../../../utils/mediaUploadKey";
import { verifyMediaUploadToken } from "../../../utils/mediaUploadToken";
import { deleteMediaStorage } from "./deleteMediaStorage";
import { resolveMediaRecordUrls } from "./resolveMediaRecordUrls";

export type MediaStorageTarget = {
  key: string;
  previewKey?: string | null;
  sizes?: unknown;
  sources?: unknown;
  access: "public" | "private";
};

const fileNameFromKey = (key: string) => key.split("/").pop() || key;

const fileExtension = (fileName: string): string | undefined => {
  const parts = fileName.split(".");
  if (parts.length < 2) return undefined;
  const extension = parts[parts.length - 1]?.trim().toLowerCase();
  return extension || undefined;
};

const removeStorageSafely = async (
  media: MediaStorageTarget,
  traceName: string,
) => {
  try {
    await deleteMediaStorage({ mediaItems: [media], traceName });
    return true;
  } catch (error) {
    Logger.error(`${traceName}: cleanup failed`, {
      key: media.key,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

export const commitMediaReplacement = async <T>({
  existingStorage,
  newStorage,
  update,
}: {
  existingStorage: MediaStorageTarget;
  newStorage: MediaStorageTarget;
  update: () => Promise<T>;
}) => {
  let updated: T;
  try {
    updated = await update();
  } catch (error) {
    await removeStorageSafely(
      newStorage,
      "manager.media.replace.new-storage-cleanup",
    );
    throw error;
  }

  const previousStorageRemoved = await removeStorageSafely(
    existingStorage,
    "manager.media.replace.previous-storage-cleanup",
  );

  return { updated, previousStorageRemoved };
};

type MediaDependency = { contentType: string; _id: string };

export const revalidateMediaDependencies = async ({
  loadDependencies,
  revalidate = checkRevalidatePath,
}: {
  loadDependencies: () => Promise<MediaDependency[]>;
  revalidate?: typeof checkRevalidatePath;
}) => {
  const dependencies = await loadDependencies();
  await Promise.all(
    dependencies.map((dependency) =>
      revalidate({
        contentType: dependency.contentType,
        contentTypeId: dependency._id,
        operation: "update",
      }),
    ),
  );
  return dependencies.length;
};

const mapMediaError = (error: unknown): never => {
  if (error instanceof MediaErrorInvalidData) {
    throwAppError("VALIDATION", {
      errors: [{ message: error.message }],
    });
  }
  if (error instanceof MediaErrorNotFound) {
    throwAppError("NOT_FOUND", { resource: "Media" });
  }
  throw error;
};

export const replaceMediaHandler = async ({
  input,
  ctx,
}: {
  input: ReplaceMediaInput;
  ctx: RakunRequestContext;
}): Promise<ReplaceMediaOutput> => {
  const user = ctx.getUser();
  const tokenPayload = verifyMediaUploadToken(input.uploadToken);
  if (!tokenPayload) {
    throwAppError("FORBIDDEN", { reason: "INVALID_UPLOAD_TOKEN" });
  }

  if (
    tokenPayload.userId !== user._id ||
    !isCompatibleMediaUploadKey(tokenPayload.key, input.key) ||
    (input.access && tokenPayload.access !== input.access) ||
    tokenPayload.purpose
  ) {
    throwAppError("FORBIDDEN", { reason: "UPLOAD_TOKEN_MISMATCH" });
  }

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
      errors: [{ message: "Only images can be replaced" }],
    });
  }
  if (tokenPayload.access !== existing.access) {
    throwAppError("VALIDATION", {
      errors: [{ message: "Replacement access must match the existing media" }],
    });
  }

  const requestedMime = input.mime || tokenPayload.mime;
  if (!requestedMime.startsWith("image/")) {
    throwAppError("VALIDATION", {
      errors: [{ message: "The replacement file must be an image" }],
    });
  }

  const mediaService = getMediaService();
  const sizes = input.sizes?.filter((size) => size.key);
  const sources = input.sources?.filter((source) => source.key);
  const relatedKeys = [
    input.previewKey,
    ...(sizes?.map((size) => size.key) ?? []),
    ...(sources?.map((source) => source.key) ?? []),
  ].filter((key): key is string => Boolean(key));
  if (
    relatedKeys.some(
      (key) => !isCompatibleMediaUploadRelatedKey(tokenPayload.key, key),
    )
  ) {
    throwAppError("FORBIDDEN", { reason: "UPLOAD_TOKEN_MISMATCH" });
  }
  const newStorage: MediaStorageTarget = {
    key: input.key,
    previewKey: input.previewKey,
    sizes,
    sources,
    access: existing.access,
  };

  let replacement;
  try {
    replacement = await commitMediaReplacement({
      existingStorage: existing,
      newStorage,
      update: async () => {
        const finalized = await mediaService.finalizeUpload({
          key: input.key,
          access: existing.access,
        });
        const resolvedFileName =
          input.fileName || fileNameFromKey(finalized.key);
        const resolvedMime = input.mime || finalized.mime || tokenPayload.mime;
        if (!resolvedMime.startsWith("image/")) {
          throwAppError("VALIDATION", {
            errors: [{ message: "The replacement file must be an image" }],
          });
        }

        return await db.update(
          Media,
          input.id,
          {
            originalName: resolvedFileName,
            key: finalized.key,
            access: existing.access,
            mime: resolvedMime,
            extension: fileExtension(resolvedFileName) ?? null,
            size: input.size ?? finalized.size,
            etag: finalized.etag ?? null,
            url: null,
            previewKey: input.previewKey ?? null,
            previewUrl: input.previewUrl ?? null,
            previewMime: input.previewMime ?? null,
            sizes: sizes?.length ? sizes : null,
            sources: sources?.length ? sources : null,
            width: input.width ?? null,
            height: input.height ?? null,
            orientation: input.orientation ?? null,
            optimized: input.optimized ?? false,
            optimizedFormat: input.optimizedFormat ?? null,
            optimizationQuality: input.optimizationQuality ?? null,
            originalSize: input.originalSize ?? input.size ?? finalized.size,
            uploadedAt: new Date(),
            updatedBy: user._id,
          },
          {
            actorId: user._id,
            reason: "replace media file while preserving references",
          },
        );
      },
    });
  } catch (error) {
    if (error instanceof MediaError) return mapMediaError(error);
    throw error;
  }
  const { updated, previousStorageRemoved } = replacement;
  let dependencyCount = 0;
  let dependenciesRevalidated = true;
  try {
    dependencyCount = await revalidateMediaDependencies({
      loadDependencies: () => db.findDependencies(Media, existing._id),
    });
  } catch (error) {
    dependenciesRevalidated = false;
    Logger.error("manager.media.replace: dependency revalidation failed", {
      mediaId: existing._id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  setApiSuccessEventData(ctx, {
    mediaId: existing._id,
    previousMime: existing.mime,
    replacementMime: updated.mime,
    optimized: updated.optimized ?? false,
    generatedSizes: sizes?.length ?? 0,
    previousStorageRemoved,
    dependencyCount,
    dependenciesRevalidated,
  });
  Logger.addTrace("manager.media.replace: completed", {
    mediaId: existing._id,
    generatedSizes: sizes?.length ?? 0,
    previousStorageRemoved,
    dependencyCount,
    dependenciesRevalidated,
  });

  const outputBase: ReplaceMediaOutput = {
    ...updated,
    sizes: sizes?.length ? sizes : undefined,
    sources: sources?.length ? sources : undefined,
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
