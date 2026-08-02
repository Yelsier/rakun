import z from "zod";

import type { EncodedBooleanField } from "./Boolean";
import type { EncodedBreadcrumsField } from "./Breadcrums";
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
  "Breadcrums",
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
  "Breadcrums",
]);

export type FieldType = z.infer<typeof FieldType>;

export type Visibility = "all" | "api" | "manager";

export const FieldCondition = z.union([
  z.object({
    field: z.string(),
    equals: z.unknown(),
  }),
  z.object({
    field: z.string(),
    notEquals: z.unknown(),
  }),
  z.object({
    field: z.string(),
    exists: z.boolean(),
  }),
  z.object({
    field: z.string(),
    gt: z.number(),
  }),
  z.object({
    field: z.string(),
    gte: z.number(),
  }),
  z.object({
    field: z.string(),
    lt: z.number(),
  }),
  z.object({
    field: z.string(),
    lte: z.number(),
  }),
  z.object({
    field: z.string(),
    includes: z.unknown(),
  }),
  z.object({
    field: z.string(),
    notIncludes: z.unknown(),
  }),
  z.object({
    field: z.string(),
    length: z.object({
      equals: z.number().int().nonnegative().optional(),
      gt: z.number().int().nonnegative().optional(),
      gte: z.number().int().nonnegative().optional(),
      lt: z.number().int().nonnegative().optional(),
      lte: z.number().int().nonnegative().optional(),
    }),
  }),
]);

export type FieldCondition = z.infer<typeof FieldCondition>;

export type FieldState = {
  required: boolean;
  translatable: boolean;
  visibility: Visibility;
  dynamic: boolean;
  description?: string;
  condition?: FieldCondition;
};

export type DefaultFieldState = {
  required: false;
  translatable: false;
  visibility: "all";
  dynamic: true;
  description?: undefined;
  condition?: undefined;
};

export const defaultFieldState: DefaultFieldState = {
  required: false,
  translatable: false,
  visibility: "all",
  dynamic: true,
};

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

export type SetCondition<
  State extends FieldState,
  Condition extends FieldCondition,
> = Omit<State, "condition"> & {
  condition: Condition;
};

export type SetDescription<State extends FieldState> = Omit<
  State,
  "description"
> & {
  description: string;
};

export type SetDynamic<
  State extends FieldState,
  Dynamic extends boolean,
> = Omit<State, "dynamic"> & {
  dynamic: Dynamic;
};

export type TranslatableValue<Value> = {
  _tag: "Translatable";
  [key: string]: Value | "Translatable";
};

type MaybeTranslatable<Value, State extends FieldState> =
  State["translatable"] extends true ? TranslatableValue<Value> : Value;

type MaybeInput<Value, State extends FieldState> =
  State["condition"] extends FieldCondition
    ? Value | null | undefined
    : State["required"] extends true
      ? Value
      : Value | null | undefined;

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
  readonly __fieldTypes?: {
    input: InputValue;
    db: DbValue;
    output: OutputValue;
    meta: Meta;
    state: State;
  };
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
  getIsDynamic: () => State["dynamic"];
  getDescription: () => State["description"];
  getCondition: () => State["condition"];
};

type FieldModifierKeys =
  | "required"
  | "translatable"
  | "apiOnly"
  | "managerOnly"
  | "noDynamic"
  | "description"
  | "condition"
  | "getPopulatedSchema";

export type FieldValueOf<F> =
  F extends { readonly __fieldTypes?: { input: infer Value } }
    ? Value
    : never;

export type FieldDbValueOf<F> =
  F extends { readonly __fieldTypes?: { db: infer Value } }
    ? Value
    : never;

export type FieldOutputValueOf<F> =
  F extends { readonly __fieldTypes?: { output: infer Value } }
    ? Value
    : never;

export type FieldMetaOf<F> =
  F extends { readonly __fieldTypes?: { meta: infer Meta } }
    ? Meta
    : never;

export type FieldStateOf<F> =
  F extends { readonly __fieldTypes?: { state: infer State extends FieldState } }
    ? State
    : never;

export type FieldMetaBase = {
  type: FieldType;
  ui: FieldUIType;
  editor?: string;
  [key: string]: unknown;
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
  noDynamic: () => WithFieldState<F, SetDynamic<FieldStateOf<F>, false>>;
  description: (
    description: string,
  ) => WithFieldState<F, SetDescription<FieldStateOf<F>>>;
  condition: <Condition extends FieldCondition>(
    condition: Condition,
  ) => WithFieldState<F, SetCondition<FieldStateOf<F>, Condition>>;
};

export type AnyField = FieldWithModifiers<AnyFieldLike>;

export type Field = AnyField;

export type EncodedField = {
  config: {
    ui: FieldUIType;
    type: FieldType;
    editor?: string;
    [key: string]: unknown;
  };
  description?: string;
  isRequired: boolean;
  isTranslatable: boolean;
  visibility: Visibility;
  isDynamic: boolean;
  condition?: FieldCondition;
};

export type EncodedFieldUnknown =
  | EncodedBooleanField
  | EncodedBreadcrumsField
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
    getIsDynamic: () => params.state.dynamic,
    getDescription: () => params.state.description,
    getCondition: () => params.state.condition,
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

export function createPluginField<
  InputValue,
  DbValue,
  OutputValue,
  Meta extends FieldMetaBase & { editor: string },
>(params: {
  meta: Meta;
  schemas: {
    input: () => z.ZodType<InputValue>;
    db: () => z.ZodType<DbValue>;
    output: () => z.ZodType<OutputValue>;
  };
}): FieldWithModifiers<
  FieldLike<InputValue, DbValue, OutputValue, Meta, DefaultFieldState>
> {
  const makeField = <State extends FieldState>(
    state: State,
  ): FieldWithModifiers<
    FieldLike<InputValue, DbValue, OutputValue, Meta, State>
  > => {
    const field = createField({
      meta: params.meta,
      state,
      schemas: params.schemas,
    });

    return withFieldModifiers({
      field,
      rebuild: <NextState extends FieldState>(nextState: NextState) =>
        makeField(nextState) as WithFieldState<
          FieldLike<InputValue, DbValue, OutputValue, Meta, State>,
          NextState
        >,
    });
  };

  return makeField(defaultFieldState);
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
    noDynamic: () =>
      rebuild({
        ...field.state,
        dynamic: false,
      } as SetDynamic<FieldStateOf<F>, false>),
    description: (description) =>
      rebuild({
        ...field.state,
        description,
      } as SetDescription<FieldStateOf<F>>),
    condition: (condition) =>
      rebuild({
        ...field.state,
        condition,
      } as SetCondition<FieldStateOf<F>, typeof condition>),
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
  if (state.condition) {
    return schema.nullish();
  }

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
