import type ContentType from "../../lib/ContentType";
import { throwAppError } from "../../lib/errors";
import { getContentTypeByName } from "../../lib/Registry";

const managerPrivateContentTypes = new Set([
  'MfaChallenge',
  'PasswordResetToken',
  'Session',
  'UserMfa',
  'WebAuthnCredential',
  'WebAuthnRegChallenge',
])

export const requireContentType = (contentTypeName: string): ContentType => {
  const contentType = getContentTypeByName(contentTypeName);

  if (!contentType) {
    throwAppError("NOT_FOUND", {
      resource: "ContentType",
      id: contentTypeName,
    });
  }

  if (managerPrivateContentTypes.has(contentType.name)) {
    throwAppError('FORBIDDEN', {
      reason: 'This internal authentication resource is not accessible through generic manager operations',
    })
  }

  return contentType;
};
