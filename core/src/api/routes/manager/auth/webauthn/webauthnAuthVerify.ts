import {
  AuthenticationResponseJSON,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

import { ORIGIN, RP_ID, toBase64URL } from "./share";
import {
  MfaChallenge,
  WebAuthnCredential,
  ManagerUser,
  Session,
} from "../../../../../internal-content-types";
import { throwAppError } from "../../../../../lib/errors";
import { getMongoService } from "../../../../../orm";
import { SESSION_MAX_AGE_MS } from "../../../../sessionCookie";
import {
  assertAuthRateLimit,
  resetAuthRateLimit,
} from "../../../../utils/authRateLimit";

export const webauthnAuthVerifyHandler = async ({
  input,
}: {
  input: { challengeToken: string; response: AuthenticationResponseJSON };
}) => {
  const db = await getMongoService();
  const rateLimitKey = `mfa:webauthn:${input.challengeToken}`;

  assertAuthRateLimit({
    key: rateLimitKey,
    limit: 8,
    windowMs: 5 * 60 * 1000,
  });

  const ch = await db.find(MfaChallenge, { token: input.challengeToken });
  if (!ch) throw new Error("CHALLENGE_NOT_FOUND");
  if (ch.method !== "webauthn") throw new Error("WRONG_MFA_METHOD");
  if (!ch.webAuthnChallenge) throw new Error("MISSING_WEBAUTHN_CHALLENGE");
  if (ch.consumedAt) throw new Error("CHALLENGE_CONSUMED");
  if (new Date(ch.expiresAt).getTime() <= Date.now())
    throw new Error("CHALLENGE_EXPIRED");

  const userId = ch.user._id;

  const credIdB64 = Buffer.from(input.response.rawId, "base64url").toString(
    "base64",
  );
  const legacyDoubleEncodedCredId = Buffer.from(
    input.response.rawId,
    "utf8",
  ).toString("base64");
  let cred = await db.find(WebAuthnCredential, {
    credentialId: input.response.rawId,
    "user._id": userId,
  });
  if (!cred) {
    cred = await db.find(WebAuthnCredential, {
      credentialId: credIdB64,
      "user._id": userId,
    });
  }
  if (!cred) {
    cred = await db.find(WebAuthnCredential, {
      credentialId: legacyDoubleEncodedCredId,
      "user._id": userId,
    });
  }
  if (!cred) {
    throwAppError("NOT_FOUND", {
      id: input.response.rawId,
      resource: "WebAuthnCredential",
    });
  }

  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: ch.webAuthnChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: toBase64URL(cred.credentialId),
      publicKey: Buffer.from(cred.publicKey, "base64"),
      counter: Number(cred.counter ?? 0),
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    throwAppError("INTERNAL", {
      message: "Authentication failed",
    });
  }
  resetAuthRateLimit(rateLimitKey);

  // actualiza counter
  await db.update(WebAuthnCredential, cred._id, {
    counter: verification.authenticationInfo.newCounter,
  });

  // consume challenge
  await db.update(MfaChallenge, ch._id, { consumedAt: new Date() });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await db.create(Session, {
    token,
    user: {
      _id: userId,
      contentType: ManagerUser.name,
      type: "existing",
    },
    expiresAt,
    _type: "Session",
  });

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  };
};
