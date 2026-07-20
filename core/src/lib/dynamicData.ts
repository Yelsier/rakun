import z from "zod";

export const DYNAMIC_BINDINGS_FIELD_NAME = "_bindings";

export const DynamicDataOptionsSchema = z.union([
  z.boolean(),
  z.object({
    fields: z.array(z.string()).optional(),
    lists: z.array(z.string()).optional(),
  }),
]);

export type DynamicDataOptions = z.infer<typeof DynamicDataOptionsSchema>;

export type DynamicDataSourceDescriptor = {
  name: string;
  dynamicDataSource?: boolean;
};

const dynamicBindingSourceSchema = z.object({
  kind: z.never().optional(),
  contentType: z.string(),
  id: z.string().optional(),
  path: z.string().optional(),
  virtual: z.enum(["href"]).optional(),
  routeKey: z.string().optional(),
});

const dynamicRelatedCollectionSourceSchema = z.object({
  kind: z.literal("relatedCollection"),
  contentType: z.string(),
  relation: z.string(),
  path: z.string(),
  limit: z.number().int().min(1).max(100),
  sort: z.record(z.string(), z.enum(["asc", "desc"])).optional(),
});

const dynamicListMapSourceSchema = z.union([
  dynamicBindingSourceSchema,
  dynamicRelatedCollectionSourceSchema,
]);

const dynamicQuerySchema = z
  .object({
    filter: z.record(z.string(), z.any()).optional(),
    options: z
      .object({
        fields: z.array(z.string()).optional(),
        limit: z.number().or(z.literal("all")).optional(),
        page: z.number().optional(),
        sort: z.record(z.string(), z.enum(["asc", "desc"])).optional(),
      })
      .optional(),
  })
  .optional();

const dynamicListBindingSchema = z.object({
  contentType: z.string(),
  query: dynamicQuerySchema,
  itemName: z.string(),
  map: z.record(z.string(), dynamicListMapSourceSchema),
});

export const DynamicDocumentBindingsSchema = z.object({
  fields: z.record(z.string(), dynamicBindingSourceSchema).optional(),
  lists: z.record(z.string(), dynamicListBindingSchema).optional(),
});

export type DynamicBindingSource = Omit<
  z.infer<typeof dynamicBindingSourceSchema>,
  "kind"
>;
export type DynamicRelatedCollectionSource = z.infer<
  typeof dynamicRelatedCollectionSourceSchema
>;
export type DynamicListMapSource =
  | DynamicBindingSource
  | DynamicRelatedCollectionSource;
export type DynamicListBinding = z.infer<typeof dynamicListBindingSchema>;
export type DynamicDocumentBindings = z.infer<
  typeof DynamicDocumentBindingsSchema
>;

export const getDynamicDocumentBindings = (
  value: unknown,
): DynamicDocumentBindings | undefined => {
  const parsed = DynamicDocumentBindingsSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

export const isDynamicDataSourceContentTypeAllowed = (
  sourceContentType: DynamicDataSourceDescriptor | undefined,
) => sourceContentType?.dynamicDataSource === true;
