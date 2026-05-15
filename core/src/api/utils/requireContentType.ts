import type ContentType from "../../lib/ContentType";
import { throwAppError } from "../../lib/errors";
import { getContentTypeByName } from "../../lib/Registry";

export const requireContentType = (contentTypeName: string): ContentType => {
  const contentType = getContentTypeByName(contentTypeName);

  if (!contentType) {
    throwAppError("NOT_FOUND", {
      resource: "ContentType",
      id: contentTypeName,
    });
  }

  return contentType;
};
