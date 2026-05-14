import z from "zod";

import type {
  AnyField,
  EncodedFieldUnknown,
  InferDb,
  InferInput,
  InferOutput,
  InferPopulated,
} from "./fields/Field";
import { isNeverOptional } from "./utils/isNeverOptional";
import type { DBService } from "../orm/dbService";

export const Menu = z
  .object({
    title: z.string(),
    icon: z.string().optional(),
    category: z.string().optional(),
  })
  .optional();

export type Menu = z.infer<typeof Menu>;

export const DocumentVisibility = z.enum(["draft", "hidden", "published"]);

export type DocumentVisibility = z.infer<typeof DocumentVisibility>;

export type VersioningOptions = {
  maxVersions?: number;
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

type ContentTypeInputShape<F extends FieldRecord, N extends string> = Simplify<
  InputFields<F> & {
    _type: N;
    _schemaVersion?: number;
    _visibility?: DocumentVisibility;
    _revision?: number;
    createdBy?: string;
    updatedBy?: string;
  }
>;

type ContentTypeDbShape<F extends FieldRecord, N extends string> = Simplify<
  DbFields<F> & {
    _id: string;
    _type: N;
    _schemaVersion?: number;
    _visibility?: DocumentVisibility;
    _revision?: number;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    updatedBy?: string;
  }
>;

type ContentTypeOutputShape<F extends FieldRecord, N extends string> = Simplify<
  OutputFields<F> & {
    _type: N;
    _id: string;
    _schemaVersion?: number;
    _visibility?: DocumentVisibility;
    _revision?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }
>;

type ContentTypePopulatedShape<
  F extends FieldRecord,
  N extends string,
> = Simplify<
  PopulatedFields<F> & {
    _type: N;
    _id: string;
    _schemaVersion?: number;
    _visibility?: DocumentVisibility;
    _revision?: number;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    updatedBy?: string;
  }
>;

export type ContentTypeInput<CT> = CT extends ContentType<infer F, infer N>
  ? ContentTypeInputShape<F, N>
  : never;

export type ContentTypeDb<CT> = CT extends ContentType<infer F, infer N>
  ? ContentTypeDbShape<F, N>
  : never;

export type ContentTypeOutput<CT> = CT extends ContentType<infer F, infer N>
  ? ContentTypeOutputShape<F, N>
  : never;

export type ContentTypePopulated<CT> = CT extends ContentType<infer F, infer N>
  ? ContentTypePopulatedShape<F, N>
  : never;

export default class ContentType<
  F extends FieldRecord = FieldRecord,
  N extends string = string,
> {
  name: N;
  fields: F;
  menu?: Menu;
  uniques: Array<Array<string>> = [];
  listFields?: string[];
  collapseFields?: string[];
  isHiddenFromManager?: boolean;
  schemaVersion?: number;
  migrations: ContentTypeMigration[] = [];
  versioning?: boolean | VersioningOptions;
  documentVisibility?: boolean;

  constructor(params: {
    name: N;
    fields: F;
    menu?: Menu;
    uniques?: Array<Array<keyof F>>;
    listFields?: NestedPaths<ContentTypePopulatedShape<F, N>>[];
    schemaVersion?: number;
    migrations?: ContentTypeMigration[];
    versioning?: boolean | VersioningOptions;
    documentVisibility?: boolean;
  }) {
    this.name = params.name;
    this.fields = this.bindSelfRelations(params.fields) as F;
    this.menu = params.menu;
    this.listFields = params.listFields as string[];
    this.uniques = (params.uniques as Array<Array<string>>) || [];
    this.schemaVersion = params.schemaVersion;
    this.migrations = params.migrations || [];
    this.versioning = params.versioning;
    this.documentVisibility = params.documentVisibility;
  }

  getInputSchema() {
    return z.object({
      ...this.fieldSchemas("input"),
      _type: z.literal(this.name),
      _schemaVersion: z.number().optional(),
      _visibility: DocumentVisibility.optional(),
      _revision: z.number().optional(),
      createdBy: z.string().optional(),
      updatedBy: z.string().optional(),
    }) as unknown as z.ZodType<
      ContentTypeInputShape<F, N>,
      ContentTypeInputShape<F, N>
    >;
  }

  getSchema() {
    return z.object({
      ...this.fieldSchemas("db"),
      _type: z.literal(this.name),
      _schemaVersion: z.number().optional(),
      _visibility: DocumentVisibility.optional(),
      _revision: z.number().optional(),
    }) as unknown as z.ZodType<
      ContentTypeDbShape<F, N>,
      ContentTypeDbShape<F, N>
    >;
  }

  getPopulatedSchema() {
    return z.object({
      ...this.fieldSchemas("populated"),
      _type: z.literal(this.name),
      _id: z.string(),
      _schemaVersion: z.number().optional(),
      _visibility: DocumentVisibility.optional(),
      _revision: z.number().optional(),
      createdBy: z.string().optional(),
      updatedBy: z.string().optional(),
    }) as unknown as z.ZodType<
      ContentTypePopulatedShape<F, N>,
      ContentTypePopulatedShape<F, N>
    >;
  }

  getOutputSchema() {
    return z.object({
      ...this.outputFieldSchemas(this.fields),
      _type: z.literal(this.name),
      _id: z.string(),
      _schemaVersion: z.number().optional(),
      _visibility: DocumentVisibility.optional(),
      _revision: z.number().optional(),
    }) as unknown as z.ZodType<
      ContentTypeOutputShape<F, N>,
      ContentTypeOutputShape<F, N>
    >;
  }

  getOutputSchemaWithoutIterators() {
    return z.object({
      ...this.outputFieldSchemas(
        Object.fromEntries(
          Object.entries(this.fields).filter(
            ([, field]) => field.meta.ui !== "Iterator",
          ),
        ) as NonIteratorFields<F>,
      ),
      _type: z.literal(this.name),
      _id: z.string(),
      _schemaVersion: z.number().optional(),
      _visibility: DocumentVisibility.optional(),
      _revision: z.number().optional(),
    }) as unknown as z.ZodType<
      ContentTypeOutputShape<NonIteratorFields<F>, N>,
      ContentTypeOutputShape<NonIteratorFields<F>, N>
    >;
  }

  validate(data: unknown) {
    return this.getInputSchema().parse(data);
  }

  partialValidate(data: unknown) {
    return (this.getInputSchema() as unknown as z.ZodObject<any>)
      .partial()
      .parse(data);
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

  enableDocumentVisibility() {
    this.documentVisibility = true;
    return this;
  }

  apiOnly() {
    const fields = mapFields(
      this.fields,
      (field) => field.apiOnly(),
    ) as unknown as ApiOnlyFields<F>;

    const contentType = new ContentType<ApiOnlyFields<F>, N>({
      name: this.name,
      fields,
      menu: this.menu,
      uniques: this.uniques as Array<Array<keyof ApiOnlyFields<F>>>,
      listFields: this.listFields as NestedPaths<
        ContentTypePopulatedShape<ApiOnlyFields<F>, N>
      >[],
    });
    contentType.isHiddenFromManager = this.isHiddenFromManager;
    contentType.collapseFields = this.collapseFields;
    contentType.schemaVersion = this.schemaVersion;
    contentType.migrations = this.migrations;
    contentType.versioning = this.versioning;
    contentType.documentVisibility = this.documentVisibility;
    return contentType;
  }

  managerOnly() {
    const fields = mapFields(
      this.fields,
      (field) => field.managerOnly(),
    ) as unknown as ManagerOnlyFields<F>;

    const contentType = new ContentType<ManagerOnlyFields<F>, N>({
      name: this.name,
      fields,
      menu: this.menu,
      uniques: this.uniques as Array<Array<keyof ManagerOnlyFields<F>>>,
      listFields: this.listFields as NestedPaths<
        ContentTypePopulatedShape<ManagerOnlyFields<F>, N>
      >[],
    });
    contentType.isHiddenFromManager = this.isHiddenFromManager;
    contentType.collapseFields = this.collapseFields;
    contentType.schemaVersion = this.schemaVersion;
    contentType.migrations = this.migrations;
    contentType.versioning = this.versioning;
    contentType.documentVisibility = this.documentVisibility;
    return contentType;
  }

  private fieldSchemas(mode: "input" | "db" | "output" | "populated") {
    return Object.fromEntries(
      Object.entries(this.fields).map(([key, field]) => [
        key,
        getFieldSchema(field, mode),
      ]),
    );
  }

  private outputFieldSchemas<Fields extends FieldRecord>(fields: Fields) {
    return Object.fromEntries(
      Object.entries(fields)
        .map(([key, field]) => [key, field.getOutputSchema()] as const)
        .filter(([, schema]) => !isNeverOptional(schema)),
    );
  }

  private bindSelfRelations(fields: F): F {
    return mapFields(fields, (field) => {
      if (
        field.meta.ui === "SelfRelation" &&
        "setContentType" in field &&
        typeof field.setContentType === "function"
      ) {
        return field.setContentType(this);
      }

      return field;
    }) as F;
  }
}

function getFieldSchema(
  field: AnyField,
  mode: "input" | "db" | "output" | "populated",
) {
  if (mode === "input") return field.getInputSchema();
  if (mode === "db") return field.getSchema();
  if (mode === "output") return field.getOutputSchema();

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
  uniques: z.array(z.array(z.string())),
  listFields: z.array(z.string()).optional(),
  isHiddenFromManager: z.boolean().optional(),
  schemaVersion: z.number().optional(),
  versioning: z.union([z.boolean(), z.object({ maxVersions: z.number().optional() })]).optional(),
  documentVisibility: z.boolean().optional(),
});

export type EncodedContentType = z.infer<typeof EncodedContentTypeSchema> & {
  fields: Record<string, EncodedFieldUnknown>;
};
