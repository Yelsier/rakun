import z from "zod";

import {
  createField,
  defaultFieldState,
  type EncodedField,
  sameSchemas,
  type DefaultFieldState,
  type FieldLike,
  type FieldState,
  type FieldWithModifiers,
  type WithFieldState,
  withFieldModifiers,
} from "./Field";

export type BooleanMeta = {
  type: "Boolean";
  ui: "Boolean";
};

export type BooleanField<
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<BooleanFieldCore<State>>;

type BooleanFieldCore<State extends FieldState> = FieldLike<
  boolean,
  boolean,
  boolean,
  BooleanMeta,
  State
>;

export function booleanField(): BooleanField {
  return makeBooleanField(defaultFieldState);
}

export type EncodedBooleanField = EncodedField;

function makeBooleanField<State extends FieldState>(
  state: State,
): BooleanField<State> {
  const field: BooleanFieldCore<State> = createField({
    meta: { type: "Boolean", ui: "Boolean" },
    state,
    schemas: sameSchemas(() => z.boolean()),
  });

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeBooleanField(nextState) as WithFieldState<
        BooleanFieldCore<State>,
        NextState
      >,
  });
}
