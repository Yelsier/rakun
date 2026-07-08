import z from "zod";

import type {
  AnyField,
  EncodedFieldUnknown,
  FieldCondition,
  InferDb,
  InferInput,
  InferOutput,
  InferPopulated,
} from "./fields/Field";
import {
  iteratorField,
  type EntryContentType,
  type IteratorField,
} from "./fields/Iterator";
import { ITERATOR_FIELD_NAME, SEO_FIELD_NAME } from "./systemFields";
import { isNeverOptional } from "./utils/isNeverOptional";
import type { DBService } from "../orm/dbService";
import {
  DYNAMIC_BINDINGS_FIELD_NAME,
  DynamicDataOptionsSchema,
  DynamicDocumentBindingsSchema,
  getDynamicDocumentBindings,
  type DynamicDataOptions,
} from "./dynamicData";
import type { ContentTypeHooks } from "./hooks";
import {
  LOCALE_VARIANT_GROUP_FIELD,
  LOCALE_VARIANT_ROLE_FIELD,
  LocaleVariantRole,
} from "./localeVariants";

export const Menu = z
  .object({
    title: z.string(),
    icon: z.string().optional(),
    category: z.string().optional(),
  })
  .optional();

export type Menu = z.infer<typeof Menu>;

export const ModulePicker = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    icon: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  })
  .optional();

export type ModulePicker = z.infer<typeof ModulePicker>;

export const DocumentVisibility = z.enum([
  "draft",
  "hidden",
  "published",
  "trash",
]);

export type DocumentVisibility = z.infer<typeof DocumentVisibility>;

const DocumentVisibilityBeforeTrash = DocumentVisibility.exclude(["trash"]);

export type VersioningOptions = {
  maxVersions?: number;
};

export type ContentTypePermissionAction =
  | "own"
  | "readAny"
  | "updateAny"
  | "deleteAny";

export type ContentTypePermissions =
  | false
  | string
  | {
      resource: string;
      actions?: ContentTypePermissionAction[];
    };

export type ContentTypeMigrationContext = {
  db: DBService;
  rawDB: unknown;
  contentType: ContentType;
  backupId?: string;
};

export type ContentTypeMigration = {
  id?: string;
  from: number;
  to: number;
  description?: string;
  migrate: (
    context: ContentTypeMigrationContext,
  ) => Promise<void> | void;
};

type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | Function;

type IsPlainObject<T> = T extends Primitive
  ? false
  : T extends readonly unknown[]
    ? false
    : T extends Record<string, unknown>
      ? true
      : false;

export type NestedPaths<T, Seen = never> = T extends Seen
  ? never
  : {
      [K in Extract<keyof T, string>]: IsPlainObject<
        NonNullable<T[K]>
      > extends true
        ? `${K}` | `${K}.${NestedPaths<NonNullable<T[K]>, Seen | T>}`
        : `${K}`;
    }[Extract<keyof T, string>];

type Simplify<T> = {
  [K in keyof T as T[K] extends undefined
    ? never
    : undefined extends T[K]
      ? never
      : K]: T[K];
} & {
  [K in keyof T as T[K] extends undefined
    ? never
    : undefined extends T[K]
      ? K
      : never]?: Exclude<T[K], undefined>;
} extends infer O
  ? { [K in keyof O]: O[K] }
  : never;

type FieldRecord = Record<string, AnyField>;

type IteratorSystemField<
  I extends readonly EntryContentType[] | undefined,
> = I extends readonly EntryContentType[]
  ? {
      [ITERATOR_FIELD_NAME]: IteratorField<I>;
    }
  : {};

type ContentTypeFields<
  F extends FieldRecord,
  I extends readonly EntryContentType[] | undefined,
> = F & IteratorSystemField<I>;

type InputFields<F extends FieldRecord> = Simplify<{
  [K in keyof F]: InferInput<F[K]>;
}>;

type DbFields<F extends FieldRecord> = Simplify<{
  [K in keyof F]: InferDb<F[K]>;
}>;

type OutputFields<F extends FieldRecord> = Simplify<{
  [K in keyof F]: InferOutput<F[K]>;
}>;

type PopulatedFields<F extends FieldRecord> = Simplify<{
  [K in keyof F]: InferPopulated<F[K]>;
}>;

type ApiOnlyFields<F extends FieldRecord> = {
  [K in keyof F]: ReturnType<F[K]["apiOnly"]>;
};

type ManagerOnlyFields<F extends FieldRecord> = {
  [K in keyof F]: ReturnType<F[K]["managerOnly"]>;
};

type NonIteratorFields<F extends FieldRecord> = {
  [K in keyof F as F[K]["meta"] extends { ui: "Iterator" }
    ? never
    : K]: F[K];
};

type ContentTypeSchema<Shape> = z.ZodType<Shape, Shape>;

type ContentTypeShape<Fields, Metadata> = Simplify<Fields & Metadata>;

type BaseMetadata<N extends string> = {
  _type: N;
  _schemaVersion?: number;
  _visibility?: DocumentVisibility;
  _visibilityBeforeTrash?: Exclude<DocumentVisibility, "trash">;
  _trashed?: boolean;
  _revision?: number;
  [LOCALE_VARIANT_GROUP_FIELD]?: string;
  [LOCALE_VARIANT_ROLE_FIELD]?: z.infer<typeof LocaleVariantRole>;
};

type IdMetadata = {
  _id: string;
};

type TrashMetadata = {
  trashedAt?: Date;
  trashedBy?: string;
};

type TimestampMetadata = {
  createdAt?: Date;
  updatedAt?: Date;
};

type AuthorMetadata = {
  createdBy?: string;
  updatedBy?: string;
};

type ContentTypeInputShape<F extends FieldRecord, N extends string> =
  ContentTypeShape<InputFields<F>, BaseMetadata<N> & AuthorMetadata>;

type ContentTypeDbShape<F extends FieldRecord, N extends string> =
  ContentTypeShape<
    DbFields<F>,
    BaseMetadata<N> &
      IdMetadata &
      TrashMetadata &
      TimestampMetadata &
      AuthorMetadata
  >;

type ContentTypeOutputShape<F extends FieldRecord, N extends string> =
  ContentTypeShape<
    OutputFields<F>,
    BaseMetadata<N> &
      IdMetadata &
      Pick<TrashMetadata, "trashedAt"> &
      TimestampMetadata
  >;

type ContentTypePopulatedShape<
  F extends FieldRecord,
  N extends string,
> =
  ContentTypeShape<
    PopulatedFields<F>,
    BaseMetadata<N> &
      IdMetadata &
      TrashMetadata &
      TimestampMetadata &
      AuthorMetadata
  >;

type ContentTypeParams<
  F extends FieldRecord,
  N extends string,
  I extends readonly EntryContentType[] | undefined,
> = {
  name: N;
  fields: F;
  iterator?: I;
  menu?: Menu;
  modulePicker?: ModulePicker;
  uniques?: Array<Array<keyof ContentTypeFields<F, I>>>;
  listFields?: NestedPaths<ContentTypePopulatedShape<ContentTypeFields<F, I>, N>>[];
  schemaVersion?: number;
  migrations?: ContentTypeMigration[];
  versioning?: boolean | VersioningOptions;
  documentVisibility?: boolean;
  permissions?: ContentTypePermissions;
  hooks?: ContentTypeHooks;
  dynamicData?: DynamicDataOptions;
  dynamicDataSource?: boolean;
};

type FieldSchemaMode = "input" | "db" | "populated";
type SchemaShape = Record<string, z.ZodTypeAny>;

const baseMetadataSchema = {
  _schemaVersion: z.number().optional(),
  _visibility: DocumentVisibility.optional(),
  _visibilityBeforeTrash: DocumentVisibilityBeforeTrash.optional(),
  _trashed: z.boolean().optional(),
  _revision: z.number().optional(),
  [LOCALE_VARIANT_GROUP_FIELD]: z.string().optional(),
  [LOCALE_VARIANT_ROLE_FIELD]: LocaleVariantRole.optional(),
} satisfies SchemaShape;

const idMetadataSchema = {
  _id: z.string(),
} satisfies SchemaShape;

const trashMetadataSchema = {
  trashedAt: z.date().optional(),
  trashedBy: z.string().optional(),
} satisfies SchemaShape;

const outputTrashMetadataSchema = {
  trashedAt: trashMetadataSchema.trashedAt,
} satisfies SchemaShape;

const authorMetadataSchema = {
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
} satisfies SchemaShape;

const dynamicBindingsMetadataSchema = {
  [DYNAMIC_BINDINGS_FIELD_NAME]: DynamicDocumentBindingsSchema.optional(),
} satisfies SchemaShape;

export type ContentTypeInput<CT> = CT extends ContentType<
  infer F,
  infer N,
  infer I
>
  ? ContentTypeInputShape<ContentTypeFields<F, I>, N>
  : never;

export type ContentTypeDb<CT> = CT extends ContentType<
  infer F,
  infer N,
  infer I
>
  ? ContentTypeDbShape<ContentTypeFields<F, I>, N>
  : never;

export type ContentTypeOutput<CT> = CT extends ContentType<
  infer F,
  infer N,
  infer I
>
  ? ContentTypeOutputShape<ContentTypeFields<F, I>, N>
  : never;

export type ContentTypePopulated<CT> = CT extends ContentType<
  infer F,
  infer N,
  infer I
>
  ? ContentTypePopulatedShape<ContentTypeFields<F, I>, N>
  : never;

export default class ContentType<
  F extends FieldRecord = FieldRecord,
  N extends string = string,
  I extends readonly EntryContentType[] | undefined = undefined,
> {
  name: N;
  fields: ContentTypeFields<F, I>;
  menu?: Menu;
  modulePicker?: ModulePicker;
  uniques: Array<Array<string>> = [];
  listFields?: string[];
  collapseFields?: string[];
  isHiddenFromManager?: boolean;
  schemaVersion?: number;
  migrations: ContentTypeMigration[] = [];
  versioning?: boolean | VersioningOptions;
  documentVisibility?: boolean;
  permissions?: ContentTypePermissions;
  hooks?: ContentTypeHooks;
  dynamicData?: DynamicDataOptions;
  dynamicDataSource?: boolean;
  isInternal?: boolean;
  hasIterator = false;
  hasSeo = false;

  constructor(
    params: ContentTypeParams<F, N, I>,
    options?: { allowSystemFields?: boolean },
  ) {
    this.name = params.name;
    this.hasIterator = params.iterator !== undefined;
    this.fields = this.bindSelfRelations(
      this.buildFields(params, options),
    ) as ContentTypeFields<F, I>;
    this.menu = params.menu;
    this.modulePicker = params.modulePicker;
    this.listFields = params.listFields as string[];
    this.uniques = (params.uniques as Array<Array<string>>) || [];
    this.schemaVersion = params.schemaVersion;
    this.migrations = params.migrations || [];
    this.versioning = params.versioning;
    this.documentVisibility = params.documentVisibility;
    this.permissions = params.permissions;
    this.hooks = params.hooks;
    this.dynamicData = params.dynamicData;
    this.dynamicDataSource = params.dynamicDataSource;
  }

  getInputSchema() {
    return this.buildInputSchema(false) as unknown as ContentTypeSchema<
      ContentTypeInputShape<ContentTypeFields<F, I>, N>
    >;
  }

  private buildInputSchema(partial: boolean) {
    const schema = this.documentSchema(this.fieldSchemas("input"), {
      ...authorMetadataSchema,
      ...this.dynamicBindingsMetadataSchema(),
    });

    const inputSchema = partial ? schema.partial() : schema;

    return inputSchema.superRefine((value, ctx) => {
      this.refineRequiredDynamicFields(value, ctx, partial);
      this.refineConditionalRequiredFields(value, ctx, partial);
    });
  }

  getSchema() {
    return this.documentSchema(this.fieldSchemas("db"), {
      ...trashMetadataSchema,
      ...this.dynamicBindingsMetadataSchema(),
    }) as unknown as ContentTypeSchema<
      ContentTypeDbShape<ContentTypeFields<F, I>, N>
    >;
  }

  getPopulatedSchema() {
    return this.documentSchema(this.fieldSchemas("populated"), {
      ...idMetadataSchema,
      ...trashMetadataSchema,
      ...authorMetadataSchema,
      ...this.dynamicBindingsMetadataSchema(),
    }) as unknown as ContentTypeSchema<
      ContentTypePopulatedShape<ContentTypeFields<F, I>, N>
    >;
  }

  getOutputSchema() {
    return this.buildOutputSchema(this.fields) as unknown as ContentTypeSchema<
      ContentTypeOutputShape<ContentTypeFields<F, I>, N>
    >;
  }

  getOutputSchemaWithoutIterators() {
    return this.buildOutputSchema(
      this.nonIteratorFields(),
    ) as unknown as ContentTypeSchema<
      ContentTypeOutputShape<NonIteratorFields<F>, N>
    >;
  }

  validate(data: unknown) {
    return this.getInputSchema().parse(data);
  }

  partialValidate(data: unknown) {
    return this.buildInputSchema(true).parse(data);
  }

  validateOutput(data: unknown) {
    return this.getOutputSchema().parse(data);
  }

  hideFromManager() {
    this.isHiddenFromManager = true;
    return this;
  }

  versioned(options: boolean | VersioningOptions = true) {
    this.versioning = options;
    return this;
  }

  withMigrations(params: {
    schemaVersion: number;
    migrations: ContentTypeMigration[];
  }) {
    this.schemaVersion = params.schemaVersion;
    this.migrations = params.migrations;
    return this;
  }

  withHooks(hooks: ContentTypeHooks) {
    this.hooks = hooks;
    return this;
  }

  enableDynamicData(options: DynamicDataOptions = true) {
    this.dynamicData = options;
    return this;
  }

  enableDynamicDataSource() {
    this.dynamicDataSource = true;
    return this;
  }

  enableDocumentVisibility() {
    this.documentVisibility = true;
    return this;
  }

  enableSeoField(field: AnyField) {
    if (!this.fields[SEO_FIELD_NAME]) {
      this.fields = {
        ...this.fields,
        [SEO_FIELD_NAME]: field,
      } as ContentTypeFields<F, I>;
    }

    this.hasSeo = true;
    return this;
  }

  apiOnly() {
    const fields = mapFields(
      this.fields,
      (field) => field.apiOnly(),
    ) as unknown as ApiOnlyFields<F>;

    return this.cloneWithFields<ApiOnlyFields<F>>(fields);
  }

  managerOnly() {
    const fields = mapFields(
      this.fields,
      (field) => field.managerOnly(),
    ) as unknown as ManagerOnlyFields<F>;

    return this.cloneWithFields<ManagerOnlyFields<F>>(fields);
  }

  private documentSchema(fields: SchemaShape, metadata: SchemaShape = {}) {
    return z.object({
      ...fields,
      _type: z.literal(this.name),
      ...baseMetadataSchema,
      ...metadata,
    });
  }

  private dynamicBindingsMetadataSchema() {
    return this.hasDynamicBindableFields() ? dynamicBindingsMetadataSchema : {};
  }

  private buildOutputSchema<Fields extends FieldRecord>(fields: Fields) {
    return this.documentSchema(this.outputFieldSchemas(fields), {
      ...idMetadataSchema,
      ...outputTrashMetadataSchema,
    });
  }

  private nonIteratorFields() {
    return Object.fromEntries(
      Object.entries(this.fields).filter(
        ([, field]) => field.meta.ui !== "Iterator",
      ),
    ) as NonIteratorFields<F>;
  }

  private cloneWithFields<Fields extends FieldRecord>(fields: Fields) {
    const contentType = new ContentType<Fields, N>(
      {
        name: this.name,
        fields,
        menu: this.menu,
        modulePicker: this.modulePicker,
        uniques: this.uniques as Array<Array<keyof Fields>>,
        listFields: this.listFields as NestedPaths<
          ContentTypePopulatedShape<Fields, N>
        >[],
        permissions: this.permissions,
        hooks: this.hooks,
        dynamicData: this.dynamicData,
        dynamicDataSource: this.dynamicDataSource,
      },
      { allowSystemFields: true },
    );

    return Object.assign(contentType, {
      isHiddenFromManager: this.isHiddenFromManager,
      collapseFields: this.collapseFields,
      schemaVersion: this.schemaVersion,
      migrations: this.migrations,
      versioning: this.versioning,
      documentVisibility: this.documentVisibility,
      permissions: this.permissions,
      hooks: this.hooks,
      dynamicData: this.dynamicData,
      dynamicDataSource: this.dynamicDataSource,
      modulePicker: this.modulePicker,
      isInternal: this.isInternal,
      hasIterator: this.hasIterator,
      hasSeo: this.hasSeo,
    });
  }

  private buildFields(
    params: {
      fields: FieldRecord;
      iterator?: readonly EntryContentType[];
    },
    options?: { allowSystemFields?: boolean },
  ): FieldRecord {
    if (!options?.allowSystemFields) {
      this.validatePublicFields(params.fields);
    }

    const fields = { ...params.fields } as FieldRecord;

    if (params.iterator !== undefined) {
      fields[ITERATOR_FIELD_NAME] = iteratorField(params.iterator);
    }

    return fields;
  }

  private validatePublicFields(fields: FieldRecord) {
    if (ITERATOR_FIELD_NAME in fields) {
      throw new Error(
        `Field ${ITERATOR_FIELD_NAME} is reserved. Use ContentType.iterator instead.`,
      );
    }

    if (SEO_FIELD_NAME in fields) {
      throw new Error(
        `Field ${SEO_FIELD_NAME} is reserved. SEO is added automatically for routeable content types.`,
      );
    }

    if (DYNAMIC_BINDINGS_FIELD_NAME in fields) {
      throw new Error(
        `Field ${DYNAMIC_BINDINGS_FIELD_NAME} is reserved for dynamic data bindings.`,
      );
    }

    const iteratorFieldName = Object.entries(fields).find(
      ([, field]) => field.meta.ui === "Iterator",
    )?.[0];

    if (iteratorFieldName) {
      throw new Error(
        `Field ${iteratorFieldName} uses Fields.iterator. Use ContentType.iterator instead.`,
      );
    }
  }

  private fieldSchemas(mode: FieldSchemaMode) {
    return Object.fromEntries(
      Object.entries(this.fields).map(([key, field]) => {
        const schema = getFieldSchema(field, mode);

        return [
          key,
          this.allowsDynamicBindingForFieldEntry(key, field) &&
          mode !== "populated"
            ? schema.nullish()
            : schema,
        ];
      }),
    ) as SchemaShape;
  }

  private outputFieldSchemas<Fields extends FieldRecord>(fields: Fields) {
    return Object.fromEntries(
      Object.entries(fields)
        .map(([key, field]) => [key, field.getOutputSchema()] as const)
        .filter(([, schema]) => !isNeverOptional(schema)),
    );
  }

  private bindSelfRelations<Fields extends FieldRecord>(fields: Fields): Fields {
    return mapFields(fields, (field) => {
      if (
        field.meta.ui === "SelfRelation" &&
        "setContentType" in field &&
        typeof field.setContentType === "function"
      ) {
        return field.setContentType(this);
      }

      return field;
    }) as Fields;
  }

  private refineConditionalRequiredFields(
    data: Record<string, unknown>,
    ctx: z.RefinementCtx,
    partial: boolean,
  ) {
    for (const [key, field] of Object.entries(this.fields)) {
      const condition = field.getCondition();

      if (!condition || !field.getIsRequired()) {
        continue;
      }

      if (partial && !(condition.field in data)) {
        continue;
      }

      if (!evaluateFieldCondition(condition, data)) {
        continue;
      }

      const value = data[key];

      if (value === null || value === undefined) {
        if (this.hasDynamicBindingForField(data, key, field)) {
          continue;
        }

        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required conditional field is missing",
          path: [key],
        });
      }
    }
  }

  private refineRequiredDynamicFields(
    data: Record<string, unknown>,
    ctx: z.RefinementCtx,
    partial: boolean,
  ) {
    for (const [key, field] of Object.entries(this.fields)) {
      if (!field.getIsRequired() || field.getCondition()) {
        continue;
      }

      if (!this.allowsDynamicBindingForFieldEntry(key, field)) {
        continue;
      }

      if (partial && !(key in data)) {
        continue;
      }

      const value = data[key];

      if (
        (value === null || value === undefined) &&
        !this.hasDynamicBindingForField(data, key, field)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required field is missing",
          path: [key],
        });
      }
    }
  }

  hasDynamicBindableFields() {
    return Object.entries(this.fields).some(([key, field]) =>
      this.allowsDynamicBindingForFieldEntry(key, field),
    );
  }

  allowsDynamicBindingForField(key: string) {
    const field = this.fields[key];
    if (!field) return false;

    return this.allowsDynamicBindingForFieldEntry(key, field);
  }

  private allowsDynamicBindingForFieldEntry(key: string, field: AnyField) {
    if (this.dynamicData === false) return false;
    if (field.getVisibility() !== "all") return false;
    if (field.getIsDynamic() === false) return false;

    return key in this.fields;
  }

  private hasDynamicBindingForField(
    data: Record<string, unknown>,
    key: string,
    field: AnyField,
  ) {
    if (!this.allowsDynamicBindingForFieldEntry(key, field)) return false;

    const bindings = getDynamicDocumentBindings(
      data[DYNAMIC_BINDINGS_FIELD_NAME],
    );
    if (!bindings) return false;

    const ui = field.getConfig().ui;
    return ui === "List" || ui === "Iterator"
      ? !!bindings.lists?.[key]
      : !!bindings.fields?.[key];
  }
}

function evaluateFieldCondition(
  condition: FieldCondition,
  data: Record<string, unknown>,
) {
  const value = data[condition.field];

  if ("equals" in condition) {
    return value === condition.equals;
  }

  if ("notEquals" in condition) {
    return value !== condition.notEquals;
  }

  if ("gt" in condition) {
    return typeof value === "number" && value > condition.gt;
  }

  if ("gte" in condition) {
    return typeof value === "number" && value >= condition.gte;
  }

  if ("lt" in condition) {
    return typeof value === "number" && value < condition.lt;
  }

  if ("lte" in condition) {
    return typeof value === "number" && value <= condition.lte;
  }

  if ("includes" in condition) {
    return Array.isArray(value) && value.includes(condition.includes);
  }

  if ("notIncludes" in condition) {
    return Array.isArray(value) && !value.includes(condition.notIncludes);
  }

  if ("length" in condition) {
    if (!Array.isArray(value) && typeof value !== "string") {
      return false;
    }

    const { length } = value;
    const checks = condition.length;

    return (
      (checks.equals === undefined || length === checks.equals) &&
      (checks.gt === undefined || length > checks.gt) &&
      (checks.gte === undefined || length >= checks.gte) &&
      (checks.lt === undefined || length < checks.lt) &&
      (checks.lte === undefined || length <= checks.lte)
    );
  }

  return condition.exists
    ? value !== undefined && value !== null
    : value === undefined || value === null;
}

function getFieldSchema(
  field: AnyField,
  mode: FieldSchemaMode,
) {
  if (mode === "input") return field.getInputSchema();
  if (mode === "db") return field.getSchema();

  return "getPopulatedSchema" in field &&
    typeof field.getPopulatedSchema === "function"
    ? field.getPopulatedSchema()
    : field.getSchema();
}

function mapFields<F extends FieldRecord>(
  fields: F,
  map: (field: F[keyof F], key: keyof F) => AnyField,
) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [
      key,
      map(field as F[keyof F], key),
    ]),
  ) as {
    [K in keyof F]: ReturnType<typeof map>;
  };
}

export const EncodedContentTypeSchema = z.object({
  name: z.string(),
  fields: z.record(z.string(), z.unknown()),
  menu: Menu,
  modulePicker: ModulePicker,
  uniques: z.array(z.array(z.string())),
  listFields: z.array(z.string()).optional(),
  isHiddenFromManager: z.boolean().optional(),
  schemaVersion: z.number().optional(),
  versioning: z.union([z.boolean(), z.object({ maxVersions: z.number().optional() })]).optional(),
  documentVisibility: z.boolean().optional(),
  dynamicData: DynamicDataOptionsSchema.optional(),
  dynamicDataSource: z.boolean().optional(),
  permissions: z
    .union([
      z.literal(false),
      z.string(),
      z.object({
        resource: z.string(),
        actions: z
          .array(z.enum(["own", "readAny", "updateAny", "deleteAny"]))
          .optional(),
      }),
    ])
    .optional(),
  hasIterator: z.boolean().optional(),
  hasSeo: z.boolean().optional(),
  routes: z
    .array(
      z.object({
        key: z.string(),
        hasPage: z.boolean(),
      }),
    )
    .optional(),
  isInternal: z.boolean().optional(),
});

export type EncodedContentType = z.infer<typeof EncodedContentTypeSchema> & {
  fields: Record<string, EncodedFieldUnknown>;
};
