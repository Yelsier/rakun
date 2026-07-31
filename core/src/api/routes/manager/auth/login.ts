import { completePrimaryAuthentication } from "../../../../auth/completePrimaryAuthentication";
import { getRakunBootstrapOptions } from "../../../../bootstrapState";
import { ManagerUser } from "../../../../internal-content-types";
import { throwAppError } from "../../../../lib/errors";
import { getMongoService } from "../../../../orm";
import {
  LoginInput,
  LoginOutput,
} from "../../../../schemas/manager/auth/login";
import type { RakunRequestContext } from "../../../context";
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
  if (getRakunBootstrapOptions()?.login?.password === false) {
    throwAppError("FORBIDDEN", { reason: "LOGIN_METHOD_DISABLED" });
  }

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

  return completePrimaryAuthentication(user._id);
};
