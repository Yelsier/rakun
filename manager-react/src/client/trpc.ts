import {
  getManagerOperationMeta,
  ManagerOperationMeta,
  type ManagerOperationName,
} from "./operations";
import {
  createManagerClient,
  normalizeManagerRequestArgs,
  type ManagerClient,
  type ManagerRequestFn,
} from "./request";
import {
  instanceofAppErrorShape,
  type AppErrorShape,
} from "@rakun/core/client";

type TrpcProcedure = {
  query?: (input?: unknown) => Promise<unknown>;
  mutate?: (input?: unknown) => Promise<unknown>;
  mutation?: (input?: unknown) => Promise<unknown>;
};

export type ManagerTrpcProxyClient = Record<string, unknown>;

const extractAppErrorShape = (error: unknown): AppErrorShape | null => {
  const directMatch = instanceofAppErrorShape(error) ? error : null;

  if (directMatch) {
    return directMatch;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const candidatePaths: unknown[] = [];
  const errorRecord = error as Record<string, unknown>;

  if ("data" in errorRecord) {
    candidatePaths.push(errorRecord.data);
  }

  if ("shape" in errorRecord) {
    candidatePaths.push(errorRecord.shape);
  }

  if ("cause" in errorRecord) {
    candidatePaths.push(errorRecord.cause);
  }

  for (const candidate of candidatePaths) {
    const appError = instanceofAppErrorShape(candidate) ? candidate : null;

    if (appError) {
      return appError;
    }

    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const candidateRecord = candidate as Record<string, unknown>;

    if ("appError" in candidateRecord) {
      const nestedAppError = instanceofAppErrorShape(candidateRecord.appError)
        ? candidateRecord.appError
        : null;

      if (nestedAppError) {
        return nestedAppError;
      }
    }

    if ("data" in candidateRecord) {
      const nestedData = candidateRecord.data;

      if (nestedData && typeof nestedData === "object" && "appError" in nestedData) {
        const nestedCandidate = (nestedData as Record<string, unknown>).appError;
        const nestedAppError = instanceofAppErrorShape(nestedCandidate)
          ? nestedCandidate
          : null;

        if (nestedAppError) {
          return nestedAppError;
        }
      }
    }
  }

  return null;
};

const getTrpcProcedure = (
  client: ManagerTrpcProxyClient,
  operationName: ManagerOperationName,
): TrpcProcedure => {
  const path = operationName.split(".");
  let current: unknown = client;

  for (const segment of path) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      throw new Error(`tRPC procedure "${operationName}" was not found.`);
    }

    current = (current as Record<string, unknown>)[segment];
  }

  if (!current || typeof current !== "object") {
    throw new Error(`tRPC procedure "${operationName}" is invalid.`);
  }

  return current as TrpcProcedure;
};

export const createTrpcManagerRequest = (
  client: ManagerTrpcProxyClient,
): ManagerRequestFn => {
  const request: ManagerRequestFn = async (...args) => {
    const { name, input } = normalizeManagerRequestArgs(args);
    const meta = getManagerOperationMeta(name) as ManagerOperationMeta;
    const procedure = getTrpcProcedure(client, name);

    try {
      if (meta.kind === "query") {
        if (typeof procedure.query !== "function") {
          throw new Error(`tRPC query "${name}" does not expose .query().`);
        }

        return (await procedure.query(input)) as never;
      }

      const mutate = procedure.mutate ?? procedure.mutation;

      if (typeof mutate !== "function") {
        throw new Error(`tRPC mutation "${name}" does not expose .mutate().`);
      }

      return (await mutate(input)) as never;
    } catch (error) {
      const appError = extractAppErrorShape(error);

      if (appError) {
        throw appError;
      }

      throw error;
    }
  };

  return request;
};

export const createTrpcManagerClient = (
  client: ManagerTrpcProxyClient,
): ManagerClient => createManagerClient(createTrpcManagerRequest(client));
