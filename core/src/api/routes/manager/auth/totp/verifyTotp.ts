import * as OTPAuth from "otpauth";
import {
  MfaChallenge,
  ManagerUser,
  UserMfa,
  Session,
} from "../../../../../internal-content-types";
import { throwAppError } from "../../../../../lib/errors";
import { getMongoService } from "../../../../../orm";
import { VerifyTotpInput } from "../../../../../schemas/manager/auth/totp/verifyTotp";

export const verifyTotpHandler = async ({
  input,
}: {
  input: VerifyTotpInput;
}) => {
  const db = await getMongoService();

  const { challenge, code } = input;

  const mfaChallenge = await db.find(MfaChallenge, { token: challenge });
  if (!mfaChallenge) {
    throwAppError("NOT_FOUND", {
      id: challenge,
      resource: "MfaChallenge",
    });
  }

  if (mfaChallenge.method !== "totp") {
    throwAppError("CONFLICT", {
      message: `Unsupported MFA method: ${mfaChallenge.method}`,
    });
  }
  if (mfaChallenge.consumedAt) {
    throwAppError("CONFLICT", {
      message: "MFA challenge already consumed",
    });
  }

  if (new Date(mfaChallenge.expiresAt).getTime() <= Date.now()) {
    throwAppError("CONFLICT", {
      message: "MFA challenge expired",
    });
  }

  const attempts = Number(mfaChallenge.attempts ?? 0);
  if (attempts >= 8) {
    throwAppError("CONFLICT", {
      message: "Too many failed attempts. Please request a new code.",
    });
  }

  await db.update(MfaChallenge, mfaChallenge._id, { attempts: attempts + 1 });

  const userId = mfaChallenge.user._id;

  const user = await db.find(ManagerUser, { _id: userId });
  if (!user) {
    throwAppError("NOT_FOUND", {
      id: userId,
      resource: "ManagerUser",
    });
  }

  const mfa = await db.find(UserMfa, { "user._id": userId });
  if (!mfa?.enabled || !mfa?.totpSecret) {
    throwAppError("CONFLICT", {
      message: "TOTP MFA not enabled for this user",
    });
  }

  const totp = new OTPAuth.TOTP({
    issuer: "CMS",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(mfa.totpSecret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) {
    return {
      error: "INVALID_CODE",
    };
  }

  // consume challenge (así no se reutiliza)
  await db.update(MfaChallenge, mfaChallenge._id, { consumedAt: new Date() });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day

  await db.create(Session, {
    token,
    user: {
      _id: user._id,
      contentType: ManagerUser.name,
      type: "existing",
    },
    expiresAt,
    _type: "Session",
  });

  return {
    token,
  };
};
