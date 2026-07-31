import { completePrimaryAuthentication } from "../../../../auth/completePrimaryAuthentication";
import {
  clearPasswordFailures,
  getBlockedPasswordIp,
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
import { setApiErrorEventData } from '../../../operations/apiEventLog'
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
  const existingBlock = await getBlockedPasswordIp(ip)
  if (existingBlock) {
    setApiErrorEventData(ctx, {
      passwordLogin: {
        ip: ip ?? null,
        failedAttempts: existingBlock.failedAttempts,
        blocked: true,
      },
    })
    throwAppError('FORBIDDEN', { reason: 'IP_BLOCKED' })
  }

  const rejectInvalidCredentials = async (): Promise<never> => {
    const failure = await recordPasswordFailure(ip)
    setApiErrorEventData(ctx, {
      passwordLogin: {
        ip: ip ?? null,
        failedAttempts: failure.failedAttempts ?? 0,
        blocked: failure.blocked,
      },
    })
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
