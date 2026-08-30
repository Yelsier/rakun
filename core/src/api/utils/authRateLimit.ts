import type { RakunRequestContext } from "../context";
import { throwAppError } from "../../lib/errors";

type AttemptBucket = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, AttemptBucket>();
const MAX_ATTEMPT_BUCKETS = 10_000;
let cleanupTimer: ReturnType<typeof setTimeout> | undefined;

const cancelCleanup = () => {
  if (!cleanupTimer) return;
  clearTimeout(cleanupTimer);
  cleanupTimer = undefined;
};

const scheduleCleanup = () => {
  cancelCleanup();
  if (attempts.size === 0) return;
  const nextExpiry = Math.min(...Array.from(attempts.values(), ({ resetAt }) => resetAt));
  cleanupTimer = setTimeout(() => cleanupExpiredAttempts(), Math.max(1, nextExpiry - Date.now()));
  cleanupTimer.unref?.();
};

const cleanupExpiredAttempts = () => {
  const now = Date.now();
  for (const [key, bucket] of attempts.entries()) {
    if (bucket.resetAt <= now) {
      attempts.delete(key);
    }
  }
  scheduleCleanup();
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

  return (
    String(value || "unknown")
      .split(",")[0]
      ?.trim() || "unknown"
  );
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

  attempts.delete(key);
  attempts.set(key, {
    count: bucket && bucket.resetAt > now ? bucket.count + 1 : 1,
    resetAt: bucket && bucket.resetAt > now ? bucket.resetAt : now + windowMs,
  });
  while (attempts.size > MAX_ATTEMPT_BUCKETS) {
    const oldest = attempts.keys().next();
    if (oldest.done) break;
    attempts.delete(oldest.value);
  }
  scheduleCleanup();
};

export const resetAuthRateLimit = (key: string) => {
  attempts.delete(key);
  scheduleCleanup();
};

export const clearAuthRateLimits = () => {
  attempts.clear();
  cancelCleanup();
};
