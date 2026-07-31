import { completePrimaryAuthentication } from "../../../../auth/completePrimaryAuthentication";
import {
  assertPasswordIpAllowed,
  clearPasswordFailures,
  recordPasswordFailure,
  resolvePasswordLoginIp,
} from '../../../../auth/passwordFail2ban'
import { getRakunBootstrapOptions } from "../../../../bootstrapState";
import { LoginIpBlock, ManagerUser } from "../../../../internal-content-types";
import { throwAppError } from "../../../../lib/errors";
import { getMongoService } from "../../../../orm";
import {
  LoginInput,
  LoginOutput,
} from "../../../../schemas/manager/auth/login";
import type { RakunRequestContext } from "../../../context";
import { recordAuthEvent } from '../../../utils/authEvents'
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
  const ip = resolvePasswordLoginIp(ctx)
  await assertPasswordIpAllowed(ip)

  const rejectInvalidCredentials = async (): Promise<never> => {
    const failure = await recordPasswordFailure(ip)
    if (failure.newlyBlocked) {
      await recordAuthEvent({
        type: 'auth.password.ip-blocked',
        outcome: 'failure',
        severity: 'warning',
        ctx,
        actor: { type: 'anonymous' },
        resource: failure.recordId
          ? { type: LoginIpBlock.name, id: failure.recordId }
          : { type: LoginIpBlock.name },
        tags: ['password-login', 'ip-block'],
        data: { failedAttempts: failure.failedAttempts ?? 0 },
      })
    }

    throwAppError("FORBIDDEN", {
      reason: failure.blocked ? 'IP_BLOCKED' : "INVALID_CREDENTIALS",
    });
  }

  const user = await db.find(ManagerUser, { email: username });
  if (!user) return rejectInvalidCredentials()

  const passwordCheck = verifyStoredPassword(password, user.password);
  if (!passwordCheck.valid) return rejectInvalidCredentials()

  if (passwordCheck.needsRehash) {
    await db.update(ManagerUser, user._id, {
      password: hashPassword(password),
    });
  }
  await clearPasswordFailures(ip)

  return completePrimaryAuthentication(user._id);
};
