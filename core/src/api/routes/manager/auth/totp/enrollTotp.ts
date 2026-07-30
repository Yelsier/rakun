import { randomBytes } from "crypto";

import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { UserMfa, ManagerUser } from "../../../../../internal-content-types";
import { throwAppError } from "../../../../../lib/errors";
import { getMongoService } from "../../../../../orm";
import { RakunRequestContext } from "../../../../context";

export const enrollTotpHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const user = ctx.getUser();

  let mfa = await db.find(UserMfa, { "user._id": user._id });

  if (mfa?.enabled) {
    throwAppError("CONFLICT", {
      message: "TOTP already enabled for this user",
    });
  }

  if (!mfa)
    mfa = await db.create(UserMfa, {
      user: {
        _id: user._id,
        contentType: ManagerUser.name,
        type: "existing",
      },
      enabled: false,
      preferredMethod: "totp",
      _type: "UserMfa",
    }, { reason: 'mfa enrollment started' });

  const bytes = randomBytes(20);
  const secret = new OTPAuth.Secret({
    buffer: bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ),
  });

  const totp = new OTPAuth.TOTP({
    issuer: "CMS",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  const otpauthURL = totp.toString();
  const qrDataURL = await QRCode.toDataURL(otpauthURL, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 6,
  });

  await db.update(UserMfa, mfa._id, {
    totpSecretPending: secret.base32,
  }, { reason: 'mfa totp enrollment refreshed' });

  return {
    otpauthURL,
    qrDataURL,
  };
};
