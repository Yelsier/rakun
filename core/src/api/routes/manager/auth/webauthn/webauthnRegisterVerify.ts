import {
  RegistrationResponseJSON,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";

import { ORIGIN, RP_ID, toB64 } from "./share";
import {
  WebAuthnRegChallenge,
  WebAuthnCredential,
  ManagerUser,
  UserMfa,
} from "../../../../../internal-content-types";
import { throwAppError } from "../../../../../lib/errors";
import { getMongoService } from "../../../../../orm";
import { RakunRequestContext } from "../../../../context";

const toBase64URL = (buf: Buffer) => buf.toString("base64url");

export const webauthnRegisterVerifyHandler = async ({
  ctx,
  input,
}: {
  ctx: RakunRequestContext;
  input: {
    token: string;
    deviceName: string;
    response: RegistrationResponseJSON;
  };
}) => {
  const db = await getMongoService();
  const user = ctx.getUser();

  const reg = await db.find(WebAuthnRegChallenge, { token: input.token });
  if (!reg) {
    throwAppError("NOT_FOUND", {
      id: input.token,
      resource: "WebAuthnRegChallenge",
    });
  }

  if (reg.user?._id?.toString?.() !== user._id.toString?.()) {
    throwAppError("FORBIDDEN", {
      reason: "Challenge does not belong to the user",
    });
  }

  if (reg.consumedAt)
    throwAppError("CONFLICT", {
      message: "Challenge already consumed",
    });

  if (new Date(reg.expiresAt).getTime() <= Date.now()) {
    throwAppError("CONFLICT", {
      message: "Challenge expired",
    });
  }

  const verification = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: reg.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throwAppError("INTERNAL", {
      message: "Failed to verify registration response",
    });
  }

  const { id, publicKey, counter } = verification.registrationInfo.credential;

  await db.create(WebAuthnCredential, {
    token: crypto.randomUUID?.() ?? input.token + ":cred",
    user: { _id: user._id, contentType: ManagerUser.name, type: "existing" },
    // Store credential id in WebAuthn-native base64url format.
    credentialId: toBase64URL(Buffer.from(id, "base64url")),
    publicKey: toB64(Buffer.from(publicKey)),
    counter: Number(counter ?? 0),
    deviceName: input.deviceName,
    _type: "WebAuthnCredential",
  });

  await db.update(WebAuthnRegChallenge, reg._id, { consumedAt: new Date() });

  let mfa = await db.find(UserMfa, { "user._id": user._id });
  if (!mfa) {
    mfa = await db.create(UserMfa, {
      user: { _id: user._id, contentType: ManagerUser.name, type: "existing" },
      enabled: true,
      preferredMethod: "webauthn",
      _type: "UserMfa",
    });
  } else {
    await db.update(UserMfa, mfa._id, {
      enabled: true,
      preferredMethod: "webauthn",
      totpSecretPending: null,
    });
  }

  await db.update(ManagerUser, user._id, {
    twoFactorEnabled: true,
  });

  return { ok: true };
};
