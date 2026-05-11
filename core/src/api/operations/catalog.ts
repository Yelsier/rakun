import z from "zod";

import type { ApiOperationsOutput } from "../../schemas/manager/apiOperations";

import { createOperationPath, type RakunOperationMap } from "./types";

const toJsonSchema = (schema: z.ZodTypeAny) =>
  z.toJSONSchema(schema, { unrepresentable: "any" }) as Record<
    string,
    unknown
  >;

export const createApiOperationCatalog = (
  operations: RakunOperationMap,
): ApiOperationsOutput =>
  Object.entries(operations)
    .map(([name, operation]) => ({
      name,
      description: operation.description,
      path: createOperationPath(name),
      kind: operation.kind,
      method: operation.method,
      access: operation.access,
      input: operation.input ? toJsonSchema(operation.input) : undefined,
      output: toJsonSchema(operation.output),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
