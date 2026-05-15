import { MediaFolder, Media } from "../../../../internal-content-types";
import { isAppError, throwAppError } from "../../../../lib/errors";
import { Logger } from "../../../../lib/Logger";
import { hasPermissions } from "../../../../lib/Permissions";
import {
  MediaError,
  MediaErrorInvalidData,
  MediaErrorNotFound,
  getMediaService,
} from "../../../../media";
import { getMongoService } from "../../../../orm";
import {
  DbErrorConflict,
  DbErrorInvalidData,
} from "../../../../orm/dbService";
import { RakunRequestContext } from "../../../context";
import { checkPermissions } from "../../../utils/checkPermissions";
import { slugify } from "../../../../lib/utils/slugify";
import {
  FinalizeUploadInput,
  FinalizeUploadOutput,
} from "../../../../schemas/manager/media/finalizeUpload";

const normalizePath = (value: string): string =>
  value
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");

const fileNameFromKey = (key: string): string => key.split("/").pop() || key;

const fileExtension = (fileName: string): string | undefined => {
  const parts = fileName.split(".");
  if (parts.length < 2) return undefined;
  const ext = parts[parts.length - 1]?.trim().toLowerCase();
  return ext || undefined;
};

const ensureFolderByPath = async ({
  folderPath,
  userId,
  canReadAny,
}: {
  folderPath: string;
  userId: string;
  canReadAny: boolean;
}) => {
  const db = await getMongoService();
  const normalized = normalizePath(folderPath);
  if (!normalized) return undefined;

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return undefined;

  let parentId: string | undefined;
  let currentPath = "";
  let lastFolder:
    | {
        _id: string;
        name: string;
        slug: string;
        path: string;
      }
    | undefined;

  for (const rawSegment of segments) {
    const slug = slugify(rawSegment);
    if (!slug) continue;

    currentPath = currentPath ? `${currentPath}/${slug}` : slug;

    const existing = await db.find(
      MediaFolder,
      canReadAny
        ? { path: currentPath }
        : { path: currentPath, createdBy: userId },
    );
    if (existing) {
      parentId = existing._id;
      lastFolder = {
        _id: existing._id,
        name: existing.name,
        slug: existing.slug,
        path: existing.path,
      };
      continue;
    }

    try {
      const created = await db.create(MediaFolder, {
        _type: "MediaFolder",
        name: rawSegment,
        slug,
        path: currentPath,
        parent: parentId
          ? ({
              type: "self",
              _id: parentId,
              contentType: "MediaFolder",
            } as const)
          : undefined,
        createdBy: userId,
        updatedBy: userId,
      });

      parentId = created._id;
      lastFolder = {
        _id: created._id,
        name: created.name,
        slug: created.slug,
        path: created.path,
      };
    } catch (error) {
      if (error instanceof DbErrorConflict) {
        const conflictResolved = await db.find(
          MediaFolder,
          canReadAny
            ? { path: currentPath }
            : { path: currentPath, createdBy: userId },
        );
        if (conflictResolved) {
          parentId = conflictResolved._id;
          lastFolder = {
            _id: conflictResolved._id,
            name: conflictResolved.name,
            slug: conflictResolved.slug,
            path: conflictResolved.path,
          };
          continue;
        }

        if (!canReadAny) {
          const otherOwner = await db.find(MediaFolder, {
            path: currentPath,
          });
          if (otherOwner && otherOwner.createdBy !== userId) {
            throwAppError("FORBIDDEN", {
              reason: "You do not have access to the requested folder path",
            });
          }
        }
      }
      throw error;
    }
  }

  return lastFolder;
};

const mapMediaError = (error: unknown): never => {
  Logger.error("manager.media.finalizeUpload failed", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  if (error instanceof MediaErrorInvalidData) {
    throwAppError("VALIDATION", {
      errors: [{ message: error.message }],
    });
  }

  if (error instanceof MediaErrorNotFound) {
    throwAppError("NOT_FOUND", {
      resource: "Media",
    });
  }

  throwAppError("INTERNAL", {
    message: error instanceof Error ? error.message : "Unknown media error",
  });
};

export const finalizeUploadHandler = async ({
  input,
  ctx,
}: {
  input: FinalizeUploadInput;
  ctx: RakunRequestContext;
}): Promise<FinalizeUploadOutput> => {
  const user = ctx.getUser();

  try {
    checkPermissions(user, ["content.Media.own"]);
    Logger.addTrace("manager.media.finalizeUpload: permissions checked");

    const canReadAny = hasPermissions(user, ["content.Media.readAny"]);
    Logger.addTrace("manager.media.finalizeUpload: ownership scope resolved", {
      canReadAny,
    });

    const media = getMediaService();
    Logger.addTrace("manager.media.finalizeUpload: media service ready");
    const finalized = await media.finalizeUpload(input);
    Logger.addTrace("manager.media.finalizeUpload: storage finalized", {
      key: finalized.key,
      access: finalized.access,
      size: finalized.size,
      mime: finalized.mime,
      hasPublicUrl: Boolean(finalized.publicUrl),
    });
    const db = await getMongoService();

    let folder:
      | {
          _id: string;
          name: string;
          slug: string;
          path: string;
        }
      | undefined;

    if (input.folderId) {
      const existingFolder = await db.find(MediaFolder, {
        _id: input.folderId,
      });
      if (!existingFolder) {
        throwAppError("NOT_FOUND", {
          resource: "MediaFolder",
          id: input.folderId,
        });
      }

      folder = {
        _id: existingFolder._id,
        name: existingFolder.name,
        slug: existingFolder.slug,
        path: existingFolder.path,
      };
      Logger.addTrace("manager.media.finalizeUpload: folder loaded", {
        folderId: folder._id,
        path: folder.path,
      });
    } else if (input.folderPath) {
      folder = await ensureFolderByPath({
        folderPath: input.folderPath,
        userId: user._id,
        canReadAny,
      });
      Logger.addTrace("manager.media.finalizeUpload: folder path resolved", {
        folderId: folder?._id,
        path: folder?.path,
      });
    }

    const resolvedOriginalName =
      input.fileName || fileNameFromKey(finalized.key);
    const resolvedMime =
      input.mime || finalized.mime || "application/octet-stream";
    const resolvedSize = input.size ?? finalized.size;
    const previewKey = input.previewKey;
    const previewUrl = previewKey
      ? media.rawAdapter.publicUrl({
          key: previewKey,
          access: finalized.access,
        }) || undefined
      : undefined;
    const createdMedia = await db.create(Media, {
      _type: "Media",
      name: input.name || resolvedOriginalName,
      originalName: resolvedOriginalName,
      key: finalized.key,
      access: finalized.access,
      mime: resolvedMime,
      extension: fileExtension(resolvedOriginalName),
      size: resolvedSize,
      etag: finalized.etag,
      url: finalized.publicUrl ?? undefined,
      previewKey,
      previewUrl,
      previewMime: input.previewMime,
      width: input.width,
      height: input.height,
      orientation: input.orientation,
      optimized: input.optimized,
      optimizedFormat: input.optimizedFormat,
      optimizationQuality: input.optimizationQuality,
      originalSize: input.originalSize,
      folder: folder
        ? {
            type: "existing",
            _id: folder._id,
            contentType: "MediaFolder",
          }
        : undefined,
      uploadedAt: new Date(),
      status: input.status || "uploaded",
      createdBy: user._id,
      updatedBy: user._id,
    });
    Logger.addTrace("manager.media.finalizeUpload: media record created", {
      id: createdMedia._id,
      key: createdMedia.key,
      folderId: folder?._id,
    });

    const mediaOutput: FinalizeUploadOutput["media"] = {
      ...createdMedia,
      folder: createdMedia.folder
        ? {
            type: "existing",
            _id: createdMedia.folder._id,
            contentType: "MediaFolder",
          }
        : undefined,
    };

    return {
      ...finalized,
      size: resolvedSize,
      mime: resolvedMime,
      media: mediaOutput,
      folder,
    };
  } catch (error) {
    Logger.addTrace("manager.media.finalizeUpload: handler failed");
    if (isAppError(error)) {
      throw error;
    }
    if (error instanceof DbErrorInvalidData) {
      throwAppError("VALIDATION", {
        errors: error.issues,
      });
    }
    if (error instanceof DbErrorConflict) {
      throwAppError("CONFLICT", {
        message: error.message,
        key: String(error.details ?? ""),
      });
    }
    if (error instanceof MediaError) {
      return mapMediaError(error);
    }
    return mapMediaError(error);
  }
};
