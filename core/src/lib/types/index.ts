import type z from "zod";

import type { Field } from "../fields/Field";
import ContentType from "../ContentType";

export type ExtractFieldType<F extends Field> = F;

export type getTranslatableType<
  S,
  TTranslatable extends boolean,
> = TTranslatable extends true
  ? z.ZodType<
      { _tag: "Translatable"; [key: string]: z.output<S> | "Translatable" },
      { _tag: "Translatable"; [key: string]: z.input<S> | "Translatable" }
    >
  : S;

export type getRequiredTypeWithNull<
  S extends z.ZodType,
  TRequired extends boolean,
> = TRequired extends true ? S : z.ZodOptional<z.ZodNullable<S>>;

export type getRequiredType<
  S extends z.ZodType,
  TRequired extends boolean,
> = TRequired extends true ? S : z.ZodOptional<S>;

export type getInputTypeWithModifiers<
  S extends z.ZodType,
  TRequired extends boolean,
  TTranslatable extends boolean,
> = getRequiredTypeWithNull<getTranslatableType<S, TTranslatable>, TRequired>;

export type getTypeWithModifiers<
  S extends z.ZodType,
  TRequired extends boolean,
  TTranslatable extends boolean,
> = getRequiredType<getTranslatableType<S, TTranslatable>, TRequired>;

export type getOutputTypeWithModifiers<
  S extends z.ZodType,
  TRequired extends boolean,
> = getRequiredType<S, TRequired>;

export type If<C extends boolean, Then, Else> = C extends true ? Then : Else;

export type Or<A, B> = A extends true ? true : B extends true ? true : false;

export type Extends<A, B> = A extends B ? true : false;

export type Visibility = "api" | "manager" | "all";

export interface HKT<Args extends any[] = any[]> {
  type: unknown;
  args: Args;
}

// Aplica F a una tupla A
export type Apply<F extends HKT<any>, A extends any[]> = (F & {
  args: A;
})["type"];

export type FieldHKT = HKT<
  [z.ZodType | z.ZodOptional<z.ZodType>, boolean, boolean, Visibility]
>;

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
  : T extends readonly any[]
    ? false
    : T extends Record<string, any>
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

export type Filter<T extends ContentType> = Partial<
  Record<NestedPaths<DBOutput<T>>, any>
>;

export type FieldsQuery<T extends ContentType> =
  | Array<
      NestedPaths<keyof T["fields"] extends string ? DataPopulated<T> : never>
    >
  | string[]
  | undefined;

export type SortQuery<T extends ContentType> =
  | Record<
      keyof T["fields"] extends string ? keyof T["fields"] : string,
      "asc" | "desc"
    >
  | undefined;

export type GetAllInput<T extends ContentType> = {
  fields?: FieldsQuery<T>;
  sort?: SortQuery<T>;
};

export type ListInput<T extends ContentType> = {
  fields?: FieldsQuery<T>;
  limit?: number | "all" | undefined;
  page?: number | undefined;
  sort?: SortQuery<T>;
};

export type Query<T extends ContentType = ContentType> = {
  filter?: Filter<T>;
  options?: ListInput<T>;
};

export type TranslatableValue<T> = {
  _tag: "Translatable";
} & Record<string, T>;

export type MaybeTranslatableValue<T> = TranslatableValue<T> | T;

export type Simplify<T> = {
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

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type IsRequired<F> = F extends { schema: z.ZodOptional<any> }
  ? false
  : true;

export type RequiredKeys<F extends ContentType["fields"]> = {
  [K in keyof F]-?: IsRequired<F[K]> extends true ? K : never;
}[keyof F];

export type OptionalKeys<F extends ContentType["fields"]> = Exclude<
  keyof F,
  RequiredKeys<F>
>;

export type FieldVisibility<F> = F extends {
  getVisibility: () => infer V;
}
  ? V
  : never;

export type KeysByVisibility<
  F extends ContentType["fields"],
  V extends Visibility,
> = {
  [K in keyof F]-?: FieldVisibility<F[K]> extends V ? K : never;
}[keyof F];

export type ApiOnlyKeys<F extends ContentType["fields"]> = KeysByVisibility<
  F,
  "api"
>;

export type DBMetadata = {
  _id: string;
  _type: string;
  _schemaVersion?: number;
  _visibility?: "draft" | "hidden" | "published" | "trash";
  _visibilityBeforeTrash?: "draft" | "hidden" | "published";
  _trashed?: boolean;
  _localeVariantGroupId?: string;
  _localeVariantRole?: "primary" | "variant";
  trashedAt?: Date;
  trashedBy?: string;
  _revision?: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
};

export type FrontMetadata = Omit<DBMetadata, "createdBy" | "updatedBy">;

export type DataInput<T extends ContentType> = Prettify<
  Simplify<z.infer<ReturnType<T["getInputSchema"]>>>
>;

export type DBOutput<T extends ContentType> = Prettify<
  Simplify<z.infer<ReturnType<T["getSchema"]>>> & DBMetadata
>;

export type DataPopulated<T extends ContentType> = Prettify<
  Simplify<z.infer<ReturnType<T["getPopulatedSchema"]>>> & DBMetadata
>;

export type DataPopulatedWithoutApiOnly<T extends ContentType> = Prettify<
  Omit<DataPopulated<T>, ApiOnlyKeys<T["fields"]>>
>;

export type DataFront<T extends ContentType> = Prettify<
  Simplify<z.infer<ReturnType<T["getOutputSchema"]>>> & FrontMetadata
>;

export type FlattenTranslate<T> =
  T extends Record<string, MaybeTranslatableValue<unknown>>
    ? {
        [K in keyof T]: T[K] extends { _tag: "Translatable" }
          ? string
          : FlattenTranslate<T[K]>;
      }
    : T;

export type ErrorModule = {
  _tag: "ErrorModule";
  error: string;
  recived: unknown;
  _id: string;
  _type: "ErrorModule";
};
