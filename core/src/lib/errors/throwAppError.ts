import { Logger } from "../Logger";
import { AppError } from "./AppError";
import { ErrorCatalog, type ErrorKey, type ErrorCause } from "./errors";

export function throwAppError<K extends ErrorKey>(
  key: K,
  cause: ErrorCause<K> = {} as ErrorCause<K>,
): never {
  const def = ErrorCatalog[key];
  const parsed = def.cause.safeParse(cause);
  Logger.error("throwAppError: throwing error", {
    key,
    cause,
    validationError: parsed.success ? null : parsed.error.format(),
  });
  if (!parsed.success) {
    throw new AppError("INTERNAL", {
      message: "Invalid error cause shape",
    });
  }

  throw new AppError(key, parsed.data as ErrorCause<K>);
}
