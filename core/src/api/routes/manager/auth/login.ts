import { randomBytes } from "crypto";

import {
  ManagerUser,
  UserMfa,
  MfaChallenge,
  Session,
} from "../../../../internal-content-types";
import { throwAppError } from "../../../../lib/errors";
import { getMongoService } from "../../../../orm";
import {
  LoginInput,
  LoginOutput,
} from "../../../../schemas/manager/auth/login";
import type { RakunRequestContext } from "../../../context";
import { SESSION_MAX_AGE_MS } from "../../../sessionCookie";
import {
  assertAuthRateLimit,
  getRequestRateLimitIdentifier,
  resetAuthRateLimit,
} from "../../../utils/authRateLimit";
import { hashPassword, verifyStoredPassword } from "../../../utils/passwords";

export const loginHandler = async ({
  input,
  ctx,
}: {
  input: LoginInput;
  ctx?: RakunRequestContext;
}): Promise<LoginOutput> => {
  const { username, password } = input;
  const db = await getMongoService();
  const rateLimitKey = `login:${getRequestRateLimitIdentifier(ctx)}:${username.toLowerCase()}`;

  assertAuthRateLimit({
    key: rateLimitKey,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });

  const user = await db.find(ManagerUser, { email: username });
  if (!user)
    throwAppError("FORBIDDEN", {
      reason: "INVALID_CREDENTIALS",
    });

  const passwordCheck = verifyStoredPassword(password, user.password);
  if (!passwordCheck.valid)
    throwAppError("FORBIDDEN", {
      reason: "INVALID_CREDENTIALS",
    });

  if (passwordCheck.needsRehash) {
    await db.update(ManagerUser, user._id, {
      password: hashPassword(password),
    });
  }
  resetAuthRateLimit(rateLimitKey);

  const mfa = await db.find(UserMfa, { "user._id": user._id });
  if (mfa?.enabled) {
    const challenge = randomBytes(32).toString("hex");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 5); // 5 minutes

    await db.create(MfaChallenge, {
      token: challenge,
      user: {
        _id: user._id,
        contentType: ManagerUser.name,
        type: "existing",
      },
      method: mfa.preferredMethod ?? "totp",
      expiresAt,
      attempts: 0,
      _type: "MfaChallenge",
    });

    return {
      challenge,
      method: mfa.preferredMethod ?? "totp",
      expiresAt: expiresAt.toISOString(),
    };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

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
    expiresAt: expiresAt.toISOString(),
  };
};
