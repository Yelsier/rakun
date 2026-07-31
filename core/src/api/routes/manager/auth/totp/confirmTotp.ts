import { UserMfa, ManagerUser } from "../../../../../internal-content-types";
import { getMongoService } from "../../../../../orm";
import { RakunRequestContext } from "../../../../context";
import { ConfirmTotpInput } from "../../../../../schemas/manager/auth/totp/confirmTotp";
import * as OTPAuth from "otpauth";
import { generateRecoveryCodes } from '../../../../utils/recoveryCodes'
import { recordAuthEvent } from '../../../../utils/authEvents'

export const confirmTotpHandler = async ({
  input,
  ctx,
}: {
  input: ConfirmTotpInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const user = ctx.getUser();
  const { code } = input;

  const mfa = await db.find(UserMfa, { "user._id": user._id });
  if (!mfa?.totpSecretPending) {
    throw new Error("NO_PENDING_TOTP_ENROLLMENT");
  }

  const totp = new OTPAuth.TOTP({
    issuer: "CMS",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(mfa.totpSecretPending),
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) {
    throw new Error("INVALID_TOTP_CODE");
  }

  const recovery = generateRecoveryCodes()

  await db.update(UserMfa, mfa._id, {
    enabled: true,
    preferredMethod: "totp",
    totpSecret: mfa.totpSecretPending,
    totpSecretPending: null,
    totpVerifiedAt: new Date(),
    recoveryCodeHashes: recovery.hashes,
    recoveryCodesGeneratedAt: new Date(),
  }, { reason: 'mfa totp enabled' });

  await db.update(ManagerUser, user._id, {
    twoFactorEnabled: true,
  }, { reason: 'mfa-state-sync' });

  await recordAuthEvent({
    type: 'auth.mfa.enabled',
    outcome: 'success',
    ctx,
    actor: { type: 'manager-user', id: String(user._id) },
    resource: { type: 'ManagerUser', id: String(user._id) },
    tags: ['mfa', 'totp'],
    data: {
      method: 'totp',
      recoveryCodeCount: recovery.codes.length,
    },
  })

  return { ok: true as const, recoveryCodes: recovery.codes };
};
