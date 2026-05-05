import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";
import { ManagerUser } from "./ManagerUser";

export const UserMfa = new ContentType({
  name: "UserMfa",
  fields: {
    user: Fields.relation(ManagerUser).required(),
    enabled: Fields.boolean().required(),
    preferredMethod: Fields.select(["totp", "webauthn"]),
    totpSecret: Fields.string(),
    totpSecretPending: Fields.string(),
    totpVerifiedAt: Fields.date(),
  },
  uniques: [["user"]],
}).hideFromManager();

export type UserMfa = typeof UserMfa;
export type UserMfaManager = DBOutput<UserMfa>;
