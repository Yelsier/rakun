import { randomBytes } from "crypto";

import { generateRegistrationOptions } from "@simplewebauthn/server";

import { RP_ID, toBase64URL } from "./share";
import {
  WebAuthnCredential,
  WebAuthnRegChallenge,
  ManagerUser,
} from "../../../../../internal-content-types";
import { getMongoService } from "../../../../../orm";
import { RakunRequestContext } from "../../../../context";
import { WebauthnRegisterOptionsInput } from "../../../../../schemas/manager/auth/webauthn/webauthnRegisterOptions";

const RP_NAME = "CMS";

export const webauthnRegisterOptionsHandler = async ({
  ctx,
  input,
}: {
  ctx: RakunRequestContext;
  input: WebauthnRegisterOptionsInput;
}) => {
  const db = await getMongoService();
  const user = ctx.getUser();

  // Excluir credenciales ya registradas
  const creds =
    (
      await db.list(WebAuthnCredential, {
        filter: {
          "user._id": user._id,
        },
      })
    ).items ?? [];

  const excludeCredentials = creds.map((c) => ({
    id: toBase64URL(c.credentialId),
  }));

  await db.delete(WebAuthnRegChallenge, {
    expiresAt: { $lte: new Date() },
    consumedAt: null,
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Uint8Array.from(Buffer.from(String(user._id))),
    userName: user.email,
    attestationType: "none",
    excludeCredentials,
    userDisplayName: input.deviceName,
    authenticatorSelection: {
      userVerification: "preferred",
      residentKey: "preferred",
    },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 5);

  await db.create(WebAuthnRegChallenge, {
    token,
    user: { _id: user._id, contentType: ManagerUser.name, type: "existing" },
    challenge: options.challenge,
    expiresAt,
    _type: "WebAuthnRegChallenge",
  });

  return {
    token,
    options,
  };
};
