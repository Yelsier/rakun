import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";
import { ManagerUser } from "./ManagerUser";

export const WebAuthnCredential = new ContentType({
  name: "WebAuthnCredential",
  fields: {
    token: Fields.string().required(),
    user: Fields.relation(ManagerUser).required(),
    credentialId: Fields.string().required(),
    publicKey: Fields.string().required(),
    counter: Fields.number().required(),
    deviceName: Fields.string().required(),
  },
  uniques: [["token"]],
}).hideFromManager();

export type WebAuthnCredential = typeof WebAuthnCredential;
export type WebAuthnCredentialManager = DBOutput<WebAuthnCredential>;
