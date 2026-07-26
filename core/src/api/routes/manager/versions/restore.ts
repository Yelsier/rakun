import { Logger } from "../../../../lib/Logger";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { checkRevalidatePath } from "../../../utils/routes/revalidatePath";
import {
  RestoreVersionInput,
  RestoreVersionOutput,
} from "../../../../schemas/manager/versions";
import { checkPermissions } from "../../../utils/checkPermissions";
import { throwAppError } from "../../../../lib/errors";
import { getContentTypeByName } from "../../../../lib/Registry";
import { isRouteableContentType } from "../../../../lib/routeableContent";
import {
  getRelationId,
  getReviewPolicyForRole,
} from "../../../utils/reviews";

export const restoreVersionHandler = async ({
  input,
  ctx,
}: {
  input: RestoreVersionInput;
  ctx: RakunRequestContext;
}): Promise<RestoreVersionOutput> => {
  const user = ctx.getUser();
  checkPermissions(user, ["content.ContentVersion.updateAny"]);
  const db = await getMongoService();
  const version = await db.versions.get(input.versionId);
  const contentType = version ? getContentTypeByName(version.contentType) : undefined;
  const actorRoleId = getRelationId(user.role);
  if (version && contentType && actorRoleId && isRouteableContentType(contentType.name)) {
    const document = await db.get(contentType, version.documentId).catch(() => null);
    if (
      document?._visibility === "published" &&
      (await getReviewPolicyForRole({
        contentType: contentType.name,
        roleId: actorRoleId,
      }))
    ) {
      throwAppError("CONFLICT", {
        key: "DRAFT_VERSION_REQUIRED",
        message: "Create a draft version before restoring history onto published content",
      });
    }
  }
  const result = await db.versions.restore({
    ...input,
    actorId: user._id,
  });
  Logger.addTrace("manager.versions.restore: version restored", {
    contentType: result.version.contentType,
    documentId: result.version.documentId,
    restoredRevision: result.restored._revision,
  });
  await checkRevalidatePath({
    contentType: result.version.contentType,
    contentTypeId: result.version.documentId,
    operation: "update",
  });
  return result;
};
