import { generateAuthenticationOptions } from "@simplewebauthn/server";
import {
  MfaChallenge,
  WebAuthnCredential,
} from "../../../../../internal-content-types";
import { throwAppError } from "../../../../../lib/errors";
import { getMongoService } from "../../../../../orm";
import { RP_ID, toBase64URL } from "./share";

export const webauthnAuthOptionsHandler = async ({
  input,
}: {
  input: { challengeToken: string };
}) => {
  const db = await getMongoService();

  const ch = await db.find(MfaChallenge, { token: input.challengeToken });
  if (!ch) {
    throwAppError("NOT_FOUND", {
      id: input.challengeToken,
      resource: "MfaChallenge",
    });
  }
  if (ch.method !== "webauthn") {
    throwAppError("CONFLICT", {
      message: "Challenge method mismatch",
    });
  }
  if (ch.consumedAt) {
    throwAppError("CONFLICT", {
      message: "Challenge already consumed",
    });
  }
  if (new Date(ch.expiresAt).getTime() <= Date.now()) {
    throwAppError("CONFLICT", {
      message: "Challenge expired",
    });
  }

  const userId = ch.user._id;
  const creds =
    (await db.list(WebAuthnCredential, { filter: { "user._id": userId } }))
      ?.items ?? [];

  const allowCredentials = creds.map((c) => ({
    id: toBase64URL(c.credentialId),
  }));

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
    allowCredentials,
  });

  await db.update(MfaChallenge, ch._id, {
    webAuthnChallenge: options.challenge,
  });

  return { options };
};
