import ContentType from "../../lib/ContentType";
import { throwAppError } from "../../lib/errors";
import { Logger } from "../../lib/Logger";
import { getContentPermission } from "../../lib/Permissions";
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
  const ownPermission = getContentPermission(contentType, "own");
  const actionPermission = getContentPermission(contentType, permission);

  if (ownsContent) {
    const permissions = [ownPermission, actionPermission].filter(
      (permission): permission is string => Boolean(permission),
    );

    if (permissions.length > 0) {
      checkAnyPermissions(user, permissions);
    }
  } else {
    if (actionPermission) {
      checkPermissions(user, [actionPermission]);
    }
  }

  Logger.addTrace("ownership checked", {
    contentType: contentType.name,
    id,
    permission,
    owner: ownsContent,
  });
};
