import { Logger } from "../Logger";
import { AppError } from "./AppError";
import { ErrorCatalog, type ErrorKey, type ErrorCause } from "./errors";

const sensitiveErrorKeyPattern =
  /(authorization|challenge|cookie|credential|password|secret|session|token|totp|webauthn)/i;

const sanitizeErrorLogValue = (
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown => {
  if (value === null || value === undefined || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[circular]";
  }

  if (depth >= 6) {
    return "[max-depth]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeErrorLogValue(item, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveErrorKeyPattern.test(key)
        ? "[redacted]"
        : sanitizeErrorLogValue(item, depth + 1, seen),
    ]),
  );
};

export function throwAppError<K extends ErrorKey>(
  key: K,
  cause: ErrorCause<K> = {} as ErrorCause<K>,
): never {
  const def = ErrorCatalog[key];
  const parsed = def.cause.safeParse(cause);
  Logger?.error?.("throwAppError: throwing error", {
    key,
    cause: sanitizeErrorLogValue(cause),
    validationError: parsed.success
      ? null
      : sanitizeErrorLogValue(parsed.error.format()),
  });
  if (!parsed.success) {
    throw new AppError("INTERNAL", {
      message: "Invalid error cause shape",
    });
  }

  throw new AppError(key, parsed.data as ErrorCause<K>);
}
