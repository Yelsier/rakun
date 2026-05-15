import { Media, MediaFolder } from "../../../../internal-content-types";
import { throwAppError } from "../../../../lib/errors";
import { Logger } from "../../../../lib/Logger";
import { hasPermissions } from "../../../../lib/Permissions";
import { getMediaService } from "../../../../media";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import {
  DeleteFolderInput,
  DeleteFolderOutput,
} from "../../../../schemas/manager/media/deleteFolder";
import { checkAnyPermissions } from "../../../utils/checkPermissions";

export const deleteFolderHandler = async ({
  input,
  ctx,
}: {
  input: DeleteFolderInput;
  ctx: RakunRequestContext;
}): Promise<DeleteFolderOutput> => {
  const user = ctx.getUser();
  const db = await getMongoService();

  checkAnyPermissions(user, ["content.Media.own", "content.Media.deleteAny"]);
  Logger.addTrace("manager.media.deleteFolder: permissions checked");

  const rootFolder = await db.find(MediaFolder, { _id: input.id });
  if (!rootFolder) {
    throwAppError("NOT_FOUND", {
      resource: "MediaFolder",
      id: input.id,
    });
  }

  const canDeleteAny = hasPermissions(user, ["content.Media.deleteAny"]);
  if (!canDeleteAny && rootFolder.createdBy !== user._id) {
    throwAppError("FORBIDDEN", {
      reason: "You do not have access to delete this folder",
    });
  }
  Logger.addTrace("manager.media.deleteFolder: root folder loaded", {
    folderId: rootFolder._id,
    path: rootFolder.path,
  });

  const folderIds = new Set<string>();
  const foldersToVisit = [rootFolder];

  for (let index = 0; index < foldersToVisit.length; index += 1) {
    const folder = foldersToVisit[index];
    folderIds.add(folder._id);

    const children = await db.list(MediaFolder, {
      filter: { "parent._id": folder._id },
      options: { limit: "all" },
    });

    for (const child of children.items) {
      if (!folderIds.has(child._id)) {
        foldersToVisit.push(child);
      }
    }
  }
  Logger.addTrace("manager.media.deleteFolder: descendant folders resolved", {
    count: folderIds.size,
  });

  if (!canDeleteAny) {
    const unauthorizedFolder = foldersToVisit.find(
      (folder) => folder.createdBy !== user._id,
    );

    if (unauthorizedFolder) {
      throwAppError("FORBIDDEN", {
        reason: "You do not have access to delete all folders in this tree",
      });
    }
  }

  const folderIdList = Array.from(folderIds);
  const mediaResult = await db.list(Media, {
    filter: { "folder._id": { $in: folderIdList } },
    options: { limit: "all" },
  });
  Logger.addTrace("manager.media.deleteFolder: media resolved", {
    count: mediaResult.items.length,
  });

  if (!canDeleteAny) {
    const unauthorizedMedia = mediaResult.items.find(
      (media) => media.createdBy !== user._id,
    );

    if (unauthorizedMedia) {
      throwAppError("FORBIDDEN", {
        reason: "You do not have access to delete all media in this folder",
      });
    }
  }

  await db.delete(Media, { "folder._id": { $in: folderIdList } });
  await db.delete(MediaFolder, { _id: { $in: folderIdList } });
  Logger.addTrace("manager.media.deleteFolder: db delete success", {
    deletedFolders: folderIdList.length,
    deletedMedia: mediaResult.items.length,
  });

  try {
    const mediaService = getMediaService();
    Logger.addTrace("manager.media.deleteFolder: media service ready");

    for (const media of mediaResult.items) {
      const keysToDelete = Array.from(
        new Set([media.key, media.previewKey].filter(Boolean)),
      ) as string[];

      for (const key of keysToDelete) {
        await mediaService.rawAdapter.deleteObject({
          key,
          access: media.access,
        });
      }
    }
    Logger.addTrace("manager.media.deleteFolder: storage objects deleted", {
      mediaCount: mediaResult.items.length,
    });
  } catch (error) {
    Logger.error(
      "Failed to delete media folder storage objects after DB deletion",
      {
        folderId: input.id,
        error: (error as Error).message,
      },
    );
  }
  Logger.addTrace("manager.media.deleteFolder: handler success");

  return {
    ok: true,
    deletedFolders: folderIdList.length,
    deletedMedia: mediaResult.items.length,
  };
};
