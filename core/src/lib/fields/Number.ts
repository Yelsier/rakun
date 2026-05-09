import z from "zod";

import {
  createField,
  defaultFieldState,
  type EncodedField,
  sameSchemas,
  type DefaultFieldState,
  type FieldLike,
  type FieldState,
  type FieldStateOf,
  type FieldWithModifiers,
  type WithFieldState,
  withFieldModifiers,
} from "./Field";

export type NumberMeta = {
  type: "Number";
  ui: "Number";
  minValue?: number;
  maxValue?: number;
};

export type EncodedNumberField = EncodedField & {
  minValue?: number;
  maxValue?: number;
};

type NumberOptions = {
  minValue?: number;
  maxValue?: number;
  minMessage?: string;
  maxMessage?: string;
};

export type NumberField<
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<NumberFieldCore<State>>;

type NumberFieldCore<State extends FieldState> = NumberFieldBase<State> & {
  min: <TThis extends NumberFieldBase<FieldState>>(
    this: TThis,
    value: number,
    message?: string,
  ) => NumberField<FieldStateOf<TThis>>;
  max: <TThis extends NumberFieldBase<FieldState>>(
    this: TThis,
    value: number,
    message?: string,
  ) => NumberField<FieldStateOf<TThis>>;
};

type NumberFieldBase<State extends FieldState> = FieldLike<
  number,
  number,
  number,
  NumberMeta,
  State
>;

export function numberField(): NumberField {
  return makeNumberField({}, defaultFieldState);
}

function makeNumberField<State extends FieldState>(
  options: NumberOptions,
  state: State,
): NumberField<State> {
  const field: NumberFieldCore<State> = {
    ...createField({
      meta: {
        type: "Number",
        ui: "Number",
        minValue: options.minValue,
        maxValue: options.maxValue,
      },
      state,
      schemas: sameSchemas(() => buildNumberSchema(options)),
    }),
    min: function <TThis extends NumberFieldBase<FieldState>>(
      this: TThis,
      value: number,
      message?: string,
    ) {
      return makeNumberField(
        { ...options, minValue: value, minMessage: message },
        this.state as FieldStateOf<TThis>,
      );
    },
    max: function <TThis extends NumberFieldBase<FieldState>>(
      this: TThis,
      value: number,
      message?: string,
    ) {
      return makeNumberField(
        { ...options, maxValue: value, maxMessage: message },
        this.state as FieldStateOf<TThis>,
      );
    },
  };

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeNumberField(options, nextState) as WithFieldState<
        NumberFieldCore<State>,
        NextState
      >,
  });
}

function buildNumberSchema(options: NumberOptions): z.ZodType<number> {
  let schema = z.number();

  if (options.minValue !== undefined) {
    schema = schema.min(options.minValue, options.minMessage);
  }

  if (options.maxValue !== undefined) {
    schema = schema.max(options.maxValue, options.maxMessage);
  }

  return schema;
}
