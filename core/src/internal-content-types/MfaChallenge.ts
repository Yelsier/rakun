import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DBOutput } from "../lib/types";
import { ManagerUser } from "./ManagerUser";

export const MfaChallenge = new ContentType({
  name: "MfaChallenge",
  fields: {
    token: Fields.string().required(),
    user: Fields.relation(ManagerUser).required(),
    method: Fields.select(["totp", "webauthn"]).required(),
    expiresAt: Fields.date().required(),
    attempts: Fields.number().required(),
    consumedAt: Fields.date().optional(),
    webAuthnChallenge: Fields.string().optional(),
  },
  uniques: [["token"]],
}).hideFromManager();

export type MfaChallenge = typeof MfaChallenge;
export type MfaChallengeSchema = DataFront<MfaChallenge>;
export type MfaChallengeManager = DBOutput<MfaChallenge>;
