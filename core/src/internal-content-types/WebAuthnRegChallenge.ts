import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import { DBOutput } from "../lib/types";
import { ManagerUser } from "./ManagerUser";

export const WebAuthnRegChallenge = new ContentType({
  name: "WebAuthnRegChallenge",
  fields: {
    token: Fields.string().required(),
    user: Fields.relation(ManagerUser).required(),
    challenge: Fields.string().required(),
    expiresAt: Fields.date().required(),
    consumedAt: Fields.date(),
  },
  uniques: [["token"]],
}).hideFromManager();

export type WebAuthnRegChallenge = typeof WebAuthnRegChallenge;
export type WebAuthnRegChallengeManager = DBOutput<WebAuthnRegChallenge>;
