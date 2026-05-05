import {
  type AppErrorShape,
  ErrorCatalog,
  type ErrorCause,
  type ErrorKey,
  instanceofAppErrorShape,
} from "./errors";

export class AppError<K extends ErrorKey = ErrorKey> extends Error {
  readonly appError: Extract<AppErrorShape, { key: K }>;
  readonly statusCode: number;

  constructor(key: K, cause: ErrorCause<K>) {
    super(key);
    this.name = "AppError";
    this.appError = { key, cause } as Extract<AppErrorShape, { key: K }>;
    this.statusCode = ErrorCatalog[key].code;
  }
}

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

export const getAppErrorShape = (error: unknown): AppErrorShape | null => {
  if (error instanceof AppError) {
    return error.appError;
  }

  if (instanceofAppErrorShape(error)) {
    return error;
  }

  return null;
};

export const getAppErrorStatusCode = (error: unknown): number | null => {
  const appError = getAppErrorShape(error);

  if (!appError) {
    return null;
  }

  return ErrorCatalog[appError.key].code;
};
