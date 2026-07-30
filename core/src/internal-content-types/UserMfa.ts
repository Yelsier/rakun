import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";
import { AppError } from '../lib/errors/AppError'
import { ManagerUser } from "./ManagerUser";

const allowedMfaMutationReasons = new Set([
  'mfa enrollment started',
  'mfa totp enrollment refreshed',
  'mfa totp enabled',
  'mfa webauthn enabled',
  'mfa recovery code consumed',
  'mfa recovery codes regenerated',
])

const assertInternalMfaMutation = ({
  context,
}: {
  context: { requestContext?: unknown; reason?: string }
}) => {
  if (
    context.requestContext &&
    !allowedMfaMutationReasons.has(context.reason ?? '')
  ) {
    throw new AppError('FORBIDDEN', {
      reason: 'MFA state cannot be changed through generic CMS operations',
    })
  }
}

export const UserMfa = new ContentType({
  name: "UserMfa",
  fields: {
    user: Fields.relation(ManagerUser).required(),
    enabled: Fields.boolean().required(),
    preferredMethod: Fields.select(["totp", "webauthn"]),
    totpSecret: Fields.string(),
    totpSecretPending: Fields.string(),
    totpVerifiedAt: Fields.date(),
    recoveryCodeHashes: Fields.array(Fields.string()),
    recoveryCodesGeneratedAt: Fields.date(),
  },
  uniques: [["user"]],
})
  .withHooks({
    beforeInsert: ({ context }) => {
      assertInternalMfaMutation({ context })
    },
    beforeUpdate: ({ context }) => {
      assertInternalMfaMutation({ context })
    },
    beforeUpdateMany: ({ context }) => {
      assertInternalMfaMutation({ context })
    },
    beforeDelete: ({ context }) => {
      assertInternalMfaMutation({ context })
    },
  })
  .hideFromManager();

export type UserMfa = typeof UserMfa;
export type UserMfaManager = DBOutput<UserMfa>;
