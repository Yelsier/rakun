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
import { verifyPassword } from "../../../utils/passwords";

export const loginHandler = async ({
  input,
}: {
  input: LoginInput;
}): Promise<LoginOutput> => {
  const { username, password } = input;
  const db = await getMongoService();

  const user = await db.find(ManagerUser, { email: username });
  if (!user)
    throwAppError("FORBIDDEN", {
      reason: "INVALID_CREDENTIALS",
    });

  if (!verifyPassword(password, user.password))
    throwAppError("FORBIDDEN", {
      reason: "INVALID_CREDENTIALS",
    });

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
