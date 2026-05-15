import type { RakunOperationImplementationMap } from "./types";
import { mergeOperationContracts } from "./types";
import { traceOperationMap } from "./tracing";
import { createWebOperationContracts } from "./web-contract";
import {
  getCustomApiOperationDefinitions,
  mergeOperationMaps,
} from "./custom";
import { getLanguages } from "../utils/getLanguages";
import { getPage } from "../routes/web/page";

const getStringHeaders = (
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> | undefined => {
  const values = Object.entries(headers).flatMap(([key, value]) => {
    if (typeof value === "string") {
      return [[key, value] as const];
    }

    if (Array.isArray(value)) {
      return value.length > 0 && typeof value[0] === "string"
        ? [[key, value[0]] as const]
        : [];
    }

    return [];
  });

  if (values.length === 0) {
    return undefined;
  }

  return Object.fromEntries(values);
};

export const createWebOperationDefinitions = () => {
  const contracts = createWebOperationContracts();
  const implementations: RakunOperationImplementationMap<typeof contracts> = {
    "web.languages": {
      resolve: async () => await getLanguages(),
    },
    "web.page": {
      resolve: async ({ input, ctx }) =>
        await getPage({
          ...input,
          headers: input.headers ?? getStringHeaders(ctx.req?.headers ?? {}),
        }),
    },
    "web.test": {
      resolve: async () => ({ ok: true }),
    },
  };

  return traceOperationMap(
    mergeOperationMaps(
      mergeOperationContracts(contracts, implementations),
      getCustomApiOperationDefinitions("web"),
    ),
  );
};
