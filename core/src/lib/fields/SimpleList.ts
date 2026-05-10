import z from "zod";

import {
  createField,
  defaultFieldState,
  type AnyFieldLike,
  type DefaultFieldState,
  type EncodedField,
  type EncodedFieldUnknown,
  type FieldLike,
  type FieldOutput,
  type FieldState,
  type InferDb,
  type InferInput,
  type InferOutput,
  type InferPopulated,
  type PopulatableFieldLike,
  type WithFieldState,
  withFieldModifiers,
  type FieldWithModifiers,
} from "./Field";

type SimpleListInput<F extends AnyFieldLike> = InferInput<F>[];
type SimpleListDb<F extends AnyFieldLike> = InferDb<F>[];
type SimpleListOutput<F extends AnyFieldLike> = InferOutput<F>[];
type SimpleListPopulated<F extends AnyFieldLike> = InferPopulated<F>[];

export type SimpleListMeta<F extends AnyFieldLike = AnyFieldLike> = {
  type: "List";
  ui: "SimpleList";
  field: F["meta"];
};

export type EncodedSimpleListField = EncodedField & {
  field: EncodedFieldUnknown;
};

export type SimpleListField<
  F extends AnyFieldLike = AnyFieldLike,
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<SimpleListFieldCore<F, State>>;

type SimpleListFieldCore<
  F extends AnyFieldLike,
  State extends FieldState,
> = FieldLike<
  SimpleListInput<F>,
  SimpleListDb<F>,
  SimpleListOutput<F>,
  SimpleListMeta<F>,
  State
> &
  PopulatableFieldLike<SimpleListPopulated<F>, State> & {
    field: F;
  };

export function simpleListField<F extends AnyFieldLike>(
  field: F,
): SimpleListField<F> {
  return makeSimpleListField(field, defaultFieldState);
}

function makeSimpleListField<F extends AnyFieldLike, State extends FieldState>(
  field: F,
  state: State,
): SimpleListField<F, State> {
  const core: SimpleListFieldCore<F, State> = {
    ...createField({
      meta: {
        type: "List",
        ui: "SimpleList",
        field: field.meta,
      },
      state,
      schemas: {
        input: () => z.array(field.getInputSchema()) as z.ZodType<SimpleListInput<F>>,
        db: () => z.array(field.getSchema()) as z.ZodType<SimpleListDb<F>>,
        output: () =>
          z.array(field.getOutputSchema()) as z.ZodType<SimpleListOutput<F>>,
      },
    }),
    getPopulatedSchema: () =>
      applySimpleListOutputPresence(
        z.array(getFieldPopulatedSchema(field)) as z.ZodType<
          SimpleListPopulated<F>
        >,
        state,
      ) as z.ZodType<FieldOutput<SimpleListPopulated<F>, State>>,
    field,
  };

  return withFieldModifiers({
    field: core,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeSimpleListField(field, nextState) as WithFieldState<
        SimpleListFieldCore<F, State>,
        NextState
      >,
  });
}

function hasPopulatedSchema(
  field: AnyFieldLike,
): field is AnyFieldLike & PopulatableFieldLike<unknown, FieldState> {
  return (
    "getPopulatedSchema" in field &&
    typeof field.getPopulatedSchema === "function"
  );
}

function getFieldPopulatedSchema(field: AnyFieldLike) {
  return hasPopulatedSchema(field)
    ? field.getPopulatedSchema()
    : field.getSchema();
}

function applySimpleListOutputPresence<Value, State extends FieldState>(
  schema: z.ZodType<Value>,
  state: State,
) {
  return state.required ? schema : schema.optional();
}
