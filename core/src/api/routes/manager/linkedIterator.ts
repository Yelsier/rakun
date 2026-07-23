import { getContentPermission, hasPermissions } from "../../../lib/Permissions";
import { getMongoService } from "../../../orm";
import type {
  LinkedIteratorGetInput,
  LinkedIteratorStateOutput,
} from "../../../schemas/manager/linkedIterator";
import type { RakunRequestContext } from "../../context";
import { checkPermissions } from "../../utils/checkPermissions";
import { checkOwnership } from "../../utils/checkOwnership";
import {
  getLinkedIteratorTemplate,
  isIteratorUnlinked,
} from "../../utils/linkedIterator";
import { requireContentType } from "../../utils/requireContentType";
import { LinkedIteratorTemplate } from "../../../internal-content-types";
import { throwAppError } from "../../../lib/errors";

export const forbidLinkedIteratorTemplateAccess = (
  contentType: ReturnType<typeof requireContentType>,
) => {
  if (contentType.name === LinkedIteratorTemplate.name) {
    throwAppError("FORBIDDEN", {
      reason:
        "Linked iterator templates can only be changed through linked iterator operations",
    });
  }
};

export const canUpdateLinkedIterator = (
  contentType: ReturnType<typeof requireContentType>,
  ctx: RakunRequestContext,
) => {
  const permission = getContentPermission(contentType, "updateAny");
  return !permission || hasPermissions(ctx.getUser(), [permission]);
};

export const requireLinkedIteratorUpdate = (
  contentType: ReturnType<typeof requireContentType>,
  ctx: RakunRequestContext,
) => {
  const permission = getContentPermission(contentType, "updateAny");
  if (permission) checkPermissions(ctx.getUser(), [permission]);
};

export const linkedIteratorGetHandler = async ({
  input,
  ctx,
}: {
  input: LinkedIteratorGetInput;
  ctx: RakunRequestContext;
}): Promise<LinkedIteratorStateOutput> => {
  const contentType = requireContentType(input.contentType);
  const db = await getMongoService();

  if (!contentType.linkedIterator) {
    return {
      enabled: false,
      configured: false,
      mode: "linked",
      canUpdateShared: false,
    };
  }

  let document: Record<string, unknown> | undefined;
  if (input.documentId) {
    await checkOwnership({
      ctx,
      contentType,
      id: input.documentId,
      permission: "readAny",
    });
    document = await db.get(contentType, input.documentId);
  } else {
    const createPermission = getContentPermission(contentType, "own");
    if (createPermission) checkPermissions(ctx.getUser(), [createPermission]);
  }

  const template = await getLinkedIteratorTemplate(db, contentType);
  const mode = document && isIteratorUnlinked(document) ? "unlinked" : "linked";
  return {
    enabled: true,
    configured: template.configured,
    mode,
    iterator: template.iterator,
    revision: template.revision,
    canUpdateShared: canUpdateLinkedIterator(contentType, ctx),
  };
};
