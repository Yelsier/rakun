import { MediaFolder } from "../../../../../internal-content-types";
import { throwAppError } from "../../../../../lib/errors";
import { hasPermissions } from "../../../../../lib/Permissions";
import { slugify } from "../../../../../lib/utils/slugify";
import { getMongoService } from "../../../../../orm";
import {
  DbErrorInvalidData,
  DbErrorConflict,
} from "../../../../../orm/dbService";
import { RakunRequestContext } from "../../../../context";
import {
  CreateFolderInput,
  CreateFolderOutput,
} from "../../../../../schemas/manager/media/createFolder";
import { checkPermissions } from "../../../../utils/checkPermissions";

const normalizePath = (value: string): string =>
  value
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");

export const createFolderHandler = async ({
  input,
  ctx,
}: {
  input: CreateFolderInput;
  ctx: RakunRequestContext;
}): Promise<CreateFolderOutput> => {
  const user = ctx.getUser();
  const db = await getMongoService();

  checkPermissions(user, ["content.Media.own"]);

  const slug = slugify(input.name);
  if (!slug) {
    throwAppError("VALIDATION", {
      errors: [{ message: "Folder name is invalid" }],
    });
  }

  let parentPath = "";
  if (input.parentId) {
    const parent = await db.find(MediaFolder, { _id: input.parentId });
    if (!parent) {
      throwAppError("NOT_FOUND", {
        resource: "MediaFolder",
        id: input.parentId,
      });
    }

    if (
      !hasPermissions(user, ["content.Media.readAny"]) &&
      parent.createdBy !== user._id
    ) {
      throwAppError("FORBIDDEN", {
        reason: "You do not have access to the parent folder",
      });
    }

    parentPath = parent.path;
  }

  const path = normalizePath(parentPath ? `${parentPath}/${slug}` : slug);

  try {
    const created = await db.create(MediaFolder, {
      _type: "MediaFolder",
      name: input.name,
      slug,
      path,
      parent: input.parentId
        ? ({
            type: "self",
            _id: input.parentId,
            contentType: "MediaFolder",
          } as const)
        : undefined,
      description: input.description,
      createdBy: user._id,
      updatedBy: user._id,
    });

    return {
      _id: created._id,
      name: created.name,
      slug: created.slug,
      path: created.path,
      parentId: created.parent?._id,
      description: created.description ?? undefined,
    };
  } catch (error) {
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

    throw error;
  }
};
