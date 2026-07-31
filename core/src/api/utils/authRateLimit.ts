import type { RakunRequestContext } from "../context";
import { throwAppError } from "../../lib/errors";

type AttemptBucket = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, AttemptBucket>();

const cleanupExpiredAttempts = () => {
  const now = Date.now();
  for (const [key, bucket] of attempts.entries()) {
    if (bucket.resetAt <= now) {
      attempts.delete(key);
    }
  }
};

export const getRequestRateLimitIdentifier = (ctx?: RakunRequestContext) => {
  const headers = ctx?.req?.headers ?? {};
  const forwardedFor = headers["x-forwarded-for"];
  const realIp = headers["x-real-ip"];
  const value =
    ctx?.req?.ip ||
    (Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor || (Array.isArray(realIp) ? realIp[0] : realIp));

  return String(value || "unknown").split(",")[0]?.trim() || "unknown";
};

export const assertAuthRateLimit = ({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) => {
  cleanupExpiredAttempts();

  const now = Date.now();
  const bucket = attempts.get(key);

  if (bucket && bucket.resetAt > now && bucket.count >= limit) {
    throwAppError("FORBIDDEN", {
      reason: "RATE_LIMITED",
    });
  }

  attempts.set(key, {
    count: bucket && bucket.resetAt > now ? bucket.count + 1 : 1,
    resetAt: bucket && bucket.resetAt > now ? bucket.resetAt : now + windowMs,
  });
};

export const resetAuthRateLimit = (key: string) => {
  attempts.delete(key);
};

