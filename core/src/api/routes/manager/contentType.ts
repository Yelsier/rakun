import type { ContentTypeInput } from "../../../schemas/manager/contentType";
import {
  encodeContentTypeForManager,
  getContentTypeByName,
} from "../../../lib/Registry";
import { getContentPermission } from "../../../lib/Permissions";
import type { RakunRequestContext } from "../../context";
import { checkAnyPermissions } from "../../utils/checkPermissions";

export const contentTypeHandler = ({
  input,
  ctx,
}: {
  input: ContentTypeInput;
  ctx: RakunRequestContext;
}) => {
  const contentType = getContentTypeByName(input.contentType);

  if (!contentType) {
    return null;
  }

  const readPermission = getContentPermission(contentType, "readAny");
  if (readPermission) {
    checkAnyPermissions(ctx.getUser(), [readPermission]);
  }

  return encodeContentTypeForManager(contentType);
};
