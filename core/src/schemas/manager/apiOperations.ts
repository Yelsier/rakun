import z from "zod";

export const apiOperationJsonSchema = z.record(z.string(), z.unknown());

export const apiOperationCatalogItem = z.object({
  name: z.string(),
  description: z.string().optional(),
  path: z.string(),
  kind: z.enum(["query", "mutation"]),
  method: z.enum(["get", "post"]),
  access: z.enum(["public", "auth"]),
  input: apiOperationJsonSchema.optional(),
  output: apiOperationJsonSchema,
});

export const apiOperationsOutput = z.array(apiOperationCatalogItem);

export type ApiOperationCatalogItem = z.infer<typeof apiOperationCatalogItem>;
export type ApiOperationsOutput = z.infer<typeof apiOperationsOutput>;
