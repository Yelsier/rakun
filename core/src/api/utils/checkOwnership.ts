import ContentType from "../../lib/ContentType";
import { throwAppError } from "../../lib/errors";
import { Logger } from "../../lib/Logger";
import { Permission } from "../../lib/Permissions";
import { getMongoService } from "../../orm";
import { RakunRequestContext } from "../context";
import { checkAnyPermissions, checkPermissions } from "./checkPermissions";

export const checkOwnership = async ({
  ctx,
  contentType,
  id,
  permission,
}: {
  contentType: ContentType;
  ctx: RakunRequestContext;
  id: string;
  permission: "readAny" | "updateAny" | "deleteAny";
}) => {
  const user = ctx.getUser();
  const db = await getMongoService();

  const search = await db.find(contentType, { _id: id }, ["createdBy"]);

  if (!search) {
    throwAppError("NOT_FOUND", {
      resource: contentType.name,
      id,
    });
  }

  const ownsContent = search.createdBy === user._id;

  if (ownsContent) {
    checkAnyPermissions(user, [
      `content.${contentType.name}.own` as Permission,
      `content.${contentType.name}.${permission}` as Permission,
    ]);
  } else {
    checkPermissions(user, [
      `content.${contentType.name}.${permission}` as Permission,
    ]);
  }

  Logger.addTrace("ownership checked", {
    contentType: contentType.name,
    id,
    permission,
    owner: ownsContent,
  });
};
