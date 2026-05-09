import z from "zod";

import type { EncodedBooleanField } from "./Boolean";
import type { EncodedContentReferenceField } from "./ContentReference";
import type { EncodedDateField } from "./Date";
import type { EncodedFileField } from "./File";
import type { EncodedLinkField } from "./Link";
import type { EncodedListField } from "./List";
import type { EncodedNumberField } from "./Number";
import type { EncodedRelationField } from "./Relation";
import type { EncodedSelectField } from "./Select";
import type { EncodedSelfRelationField } from "./SelfRelation";
import type { EncodedSimpleListField } from "./SimpleList";
import type { EncodedStringField } from "./String";

export const FieldUIType = z.enum([
  "Text",
  "Number",
  "Boolean",
  "Date",
  "Textarea",
  "RichText",
  "Select",
  "MultiSelect",
  "Email",
  "Slug",
  "ContentType",
  "ContentTypeSelect",
  "ContentTypeMultiSelect",
  "List",
  "Password",
  "SelfRelation",
  "Id",
  "Url",
  "Link",
  "DateTime",
  "Time",
  "Iterator",
  "SimpleList",
  "File",
]);

export type FieldUIType = z.infer<typeof FieldUIType>;

export const FieldType = z.enum([
  "String",
  "Select",
  "Relation",
  "Number",
  "Boolean",
  "List",
  "Link",
  "Date",
  "File",
  "ContentReference",
]);

export type FieldType = z.infer<typeof FieldType>;

export type Visibility = "all" | "api" | "manager";

export type FieldState = {
  required: boolean;
  translatable: boolean;
  visibility: Visibility;
};

export type DefaultFieldState = {
  required: false;
  translatable: false;
  visibility: "all";
};

export const defaultFieldState = {
  required: false,
  translatable: false,
  visibility: "all",
} as const satisfies DefaultFieldState;

export type SetRequired<State extends FieldState> = Omit<State, "required"> & {
  required: true;
};

export type SetTranslatable<State extends FieldState> = Omit<
  State,
  "translatable"
> & {
  translatable: true;
};

export type SetVisibility<
  State extends FieldState,
  V extends Visibility,
> = Omit<State, "visibility"> & {
  visibility: V;
};

export type TranslatableValue<Value> = {
  _tag: "Translatable";
  [key: string]: Value | "Translatable";
};

type MaybeTranslatable<Value, State extends FieldState> =
  State["translatable"] extends true ? TranslatableValue<Value> : Value;

type MaybeInput<Value, State extends FieldState> =
  State["required"] extends true ? Value : Value | null | undefined;

type MaybeOutput<Value, State extends FieldState> =
  State["required"] extends true ? Value : Value | undefined;

export type FieldInput<InputValue, State extends FieldState> =
  State["visibility"] extends "api"
    ? undefined
    : MaybeInput<MaybeTranslatable<InputValue, State>, State>;

export type FieldDb<DbValue, State extends FieldState> =
  State["visibility"] extends "api"
    ? undefined
    : MaybeOutput<MaybeTranslatable<DbValue, State>, State>;

export type FieldOutput<OutputValue, State extends FieldState> =
  State["visibility"] extends "manager"
    ? undefined
    : MaybeOutput<OutputValue, State>;

export type FieldLike<
  InputValue,
  DbValue,
  OutputValue,
  Meta,
  State extends FieldState = DefaultFieldState,
> = {
  kind: "field";
  meta: Meta;
  state: State;
  toZod: () => z.ZodType<DbValue>;
  getInputSchema: () => z.ZodType<FieldInput<InputValue, State>>;
  getSchema: () => z.ZodType<FieldDb<DbValue, State>>;
  getOutputSchema: () => z.ZodType<FieldOutput<OutputValue, State>>;
  getConfig: () => Meta;
  getIsRequired: () => State["required"];
  getIsTranslatable: () => State["translatable"];
  getVisibility: () => State["visibility"];
};

type FieldModifierKeys =
  | "required"
  | "translatable"
  | "apiOnly"
  | "managerOnly"
  | "getPopulatedSchema";

export type FieldValueOf<F> =
  F extends FieldLike<infer Value, any, any, unknown, FieldState>
    ? Value
    : never;

export type FieldDbValueOf<F> =
  F extends FieldLike<any, infer Value, any, unknown, FieldState>
    ? Value
    : never;

export type FieldOutputValueOf<F> =
  F extends FieldLike<any, any, infer Value, unknown, FieldState>
    ? Value
    : never;

export type FieldMetaOf<F> =
  F extends FieldLike<unknown, unknown, unknown, infer Meta, FieldState>
    ? Meta
    : never;

export type FieldStateOf<F> =
  F extends FieldLike<unknown, unknown, unknown, unknown, infer State>
    ? State
    : never;

export type FieldMetaBase = {
  type: FieldType;
  ui: FieldUIType;
};

export type AnyFieldLike = FieldLike<
  unknown,
  unknown,
  unknown,
  FieldMetaBase,
  FieldState
>;

export type PopulatableFieldLike<
  PopulatedValue,
  State extends FieldState = DefaultFieldState,
> = {
  getPopulatedSchema: () => z.ZodType<FieldOutput<PopulatedValue, State>>;
};

export type FieldPopulatedValueOf<F> =
  F extends PopulatableFieldLike<infer Value, any> ? Value : never;

type RebindPopulatedField<
  F extends AnyFieldLike,
  State extends FieldState,
> = F extends PopulatableFieldLike<unknown, any>
  ? PopulatableFieldLike<FieldPopulatedValueOf<F>, State>
  : unknown;

export type FieldWithModifiers<F extends AnyFieldLike> = F & {
  required: () => WithFieldState<F, SetRequired<FieldStateOf<F>>>;
  translatable: () => WithFieldState<F, SetTranslatable<FieldStateOf<F>>>;
  apiOnly: () => WithFieldState<F, SetVisibility<FieldStateOf<F>, "api">>;
  managerOnly: () => WithFieldState<
    F,
    SetVisibility<FieldStateOf<F>, "manager">
  >;
};

export type AnyField = FieldWithModifiers<AnyFieldLike>;

export type Field = AnyField;

export type EncodedField = {
  config: {
    ui: FieldUIType;
    type: FieldType;
  };
  isRequired: boolean;
  isTranslatable: boolean;
  visibility: Visibility;
};

export type EncodedFieldUnknown =
  | EncodedBooleanField
  | EncodedContentReferenceField
  | EncodedDateField
  | EncodedFileField
  | EncodedLinkField
  | EncodedListField
  | EncodedNumberField
  | EncodedRelationField
  | EncodedSelectField
  | EncodedSelfRelationField
  | EncodedSimpleListField
  | EncodedStringField;

export type WithFieldState<
  F extends AnyFieldLike,
  State extends FieldState,
> = FieldWithModifiers<
  Omit<F, keyof AnyFieldLike | FieldModifierKeys> &
    FieldLike<
      FieldValueOf<F>,
      FieldDbValueOf<F>,
      FieldOutputValueOf<F>,
      FieldMetaOf<F>,
      State
    > &
    RebindPopulatedField<F, State>
>;

export type InferInput<F> =
  F extends FieldLike<infer Value, any, any, unknown, infer State>
    ? FieldInput<Value, State>
    : never;

export type InferDb<F> =
  F extends FieldLike<any, infer Value, any, unknown, infer State>
    ? FieldDb<Value, State>
    : never;

export type InferOutput<F> =
  F extends FieldLike<any, any, infer Value, unknown, infer State>
    ? FieldOutput<Value, State>
    : never;

export type InferPopulated<F> =
  F extends { getPopulatedSchema: () => z.ZodType<infer Value> }
    ? Value
    : InferDb<F>;

export function createField<
  InputValue,
  DbValue,
  OutputValue,
  Meta,
  State extends FieldState,
>(params: {
  meta: Meta;
  state: State;
  schemas: {
    input: () => z.ZodType<InputValue>;
    db: () => z.ZodType<DbValue>;
    output: () => z.ZodType<OutputValue>;
  };
}): FieldLike<InputValue, DbValue, OutputValue, Meta, State> {
  return {
    kind: "field",
    meta: params.meta,
    state: params.state,
    toZod: params.schemas.db,
    getConfig: () => params.meta,
    getIsRequired: () => params.state.required,
    getIsTranslatable: () => params.state.translatable,
    getVisibility: () => params.state.visibility,
    getInputSchema: () =>
      applyManagerVisibility(
        applyInputPresence(
          applyTranslatable(params.schemas.input(), params.state),
          params.state,
        ),
        params.state,
      ) as z.ZodType<FieldInput<InputValue, State>>,
    getSchema: () =>
      applyManagerVisibility(
        applyOutputPresence(
          applyTranslatable(params.schemas.db(), params.state),
          params.state,
        ),
        params.state,
      ) as z.ZodType<FieldDb<DbValue, State>>,
    getOutputSchema: () =>
      applyApiVisibility(
        applyOutputPresence(params.schemas.output(), params.state),
        params.state,
      ) as z.ZodType<FieldOutput<OutputValue, State>>,
  };
}

export function sameSchemas<Value>(schema: () => z.ZodType<Value>) {
  return {
    input: schema,
    db: schema,
    output: schema,
  };
}

export function withFieldModifiers<F extends AnyFieldLike>(params: {
  field: F;
  rebuild: <NextState extends FieldState>(
    state: NextState,
  ) => WithFieldState<F, NextState>;
}): FieldWithModifiers<F> {
  const { field, rebuild } = params;

  return {
    ...field,
    required: () =>
      rebuild({
        ...field.state,
        required: true,
      } as SetRequired<FieldStateOf<F>>),
    translatable: () =>
      rebuild({
        ...field.state,
        translatable: true,
      } as SetTranslatable<FieldStateOf<F>>),
    apiOnly: () =>
      rebuild({
        ...field.state,
        visibility: "api",
      } as SetVisibility<FieldStateOf<F>, "api">),
    managerOnly: () =>
      rebuild({
        ...field.state,
        visibility: "manager",
      } as SetVisibility<FieldStateOf<F>, "manager">),
  };
}

function applyTranslatable<Value>(
  schema: z.ZodType<Value>,
  state: FieldState,
) {
  if (!state.translatable) {
    return schema;
  }

  return z
    .object({
      _tag: z.literal("Translatable"),
    })
    .catchall(schema);
}

function applyInputPresence(schema: z.ZodTypeAny, state: FieldState) {
  return state.required ? schema : schema.nullish();
}

function applyOutputPresence(schema: z.ZodTypeAny, state: FieldState) {
  return state.required ? schema : schema.optional();
}

function applyManagerVisibility(schema: z.ZodTypeAny, state: FieldState) {
  return state.visibility === "api" ? z.never().optional() : schema;
}

function applyApiVisibility(schema: z.ZodTypeAny, state: FieldState) {
  return state.visibility === "manager" ? z.never().optional() : schema;
}
