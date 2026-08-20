import type { MediaAccess } from "../../media";
import { getPlatform } from '../../platform'

export type MediaUploadTokenPayload = {
  key: string;
  access: MediaAccess;
  mime: string;
  size: number;
  userId: string;
  purpose?: "profileAvatar";
  exp: number;
};

const getSecret = () => {
  const explicit =
    process.env.RAKUN_MEDIA_UPLOAD_SECRET ||
    process.env.MEDIA_UPLOAD_SECRET ||
    process.env.MEDIA_TOKEN_SECRET;

  if (explicit) return explicit;

  if (process.env.ENVIRONMENT === "production") {
    throw new Error("RAKUN_MEDIA_UPLOAD_SECRET is required in production");
  }

  return process.env.BASE_DOMAIN || "rakun-development-media-upload-secret";
};

const sign = (value: string) =>
  getPlatform().crypto.hmac('sha256', getSecret(), value, 'base64url')

const encodePayload = (payload: MediaUploadTokenPayload) =>
  Buffer.from(JSON.stringify(payload)).toString("base64url");

export const createMediaUploadToken = (
  payload: Omit<MediaUploadTokenPayload, "exp">,
  expiresInMs = 15 * 60 * 1000,
) => {
  const encoded = encodePayload({
    ...payload,
    exp: Date.now() + expiresInMs,
  });

  return `${encoded}.${sign(encoded)}`;
};

export const verifyMediaUploadToken = (token: string) => {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !getPlatform().crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload: MediaUploadTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as MediaUploadTokenPayload;
  } catch {
    return null;
  }

  if (payload.exp <= Date.now()) return null;

  return payload;
};
