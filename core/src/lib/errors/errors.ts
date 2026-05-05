import { z } from "zod";

export const ErrorCatalog = {
  AUTH_REQUIRED: {
    trpcCode: "UNAUTHORIZED",
    cause: z.object({}),
    code: 401,
  },
  FORBIDDEN: {
    trpcCode: "FORBIDDEN",
    cause: z.object({ reason: z.string().optional() }),
    code: 403,
  },
  NOT_FOUND: {
    trpcCode: "NOT_FOUND",
    cause: z.object({
      resource: z.string().optional(),
      id: z.string().optional(),
    }),
    code: 404,
  },
  VALIDATION: {
    trpcCode: "BAD_REQUEST",
    cause: z.object({
      errors: z.any(),
    }),
    code: 400,
  },
  CONFLICT: {
    trpcCode: "CONFLICT",
    cause: z.object({
      key: z.string().optional(),
      message: z.string().optional(),
    }),
    code: 409,
  },
  INTERNAL: {
    trpcCode: "INTERNAL_SERVER_ERROR",
    cause: z.object({
      traceId: z.string().optional(),
      message: z.string().optional(),
    }),
    code: 500,
  },
  FEATURE_UNSUPPORTED: {
    trpcCode: "BAD_REQUEST",
    cause: z.object({
      feature: z.string().optional(),
      message: z.string().optional(),
    }),
    code: 400,
  },
} as const;

export type ErrorKey = keyof typeof ErrorCatalog;

export type ErrorCause<K extends ErrorKey> = z.infer<
  (typeof ErrorCatalog)[K]["cause"]
>;

export type AppErrorShape = {
  [K in ErrorKey]: { key: K; cause: ErrorCause<K> };
}[ErrorKey];

export const instanceofAppErrorShape = (
  error: unknown,
): error is AppErrorShape => {
  return (
    typeof error === "object" &&
    error !== null &&
    "key" in error &&
    typeof error.key === "string" &&
    error.key in ErrorCatalog
  );
};
