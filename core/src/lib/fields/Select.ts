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

type SelectValue<
  Options extends readonly string[],
  Multiple extends boolean,
> = Multiple extends true ? Options[number][] : Options[number];

export type SelectMeta<
  Options extends readonly string[] = readonly string[],
  Multiple extends boolean = boolean,
> = {
  type: "Select";
  ui: Multiple extends true ? "MultiSelect" : "Select";
  options: Options;
  isMultiple: Multiple;
};

export type EncodedSelectField = EncodedField & {
  options: string[];
  isMultiple: boolean;
};

type SelectOptions<
  Options extends readonly string[],
  Multiple extends boolean,
> = {
  options: Options;
  multiple: Multiple;
};

export type SelectField<
  Options extends readonly string[] = readonly string[],
  Multiple extends boolean = false,
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<SelectFieldCore<Options, Multiple, State>>;

type SelectFieldCore<
  Options extends readonly string[],
  Multiple extends boolean,
  State extends FieldState,
> = SelectFieldBase<Options, Multiple, State> & {
  multiple: <
    TThis extends SelectFieldBase<Options, Multiple, FieldState>,
  >(
    this: TThis,
  ) => SelectField<Options, true, FieldStateOf<TThis>>;
};

type SelectFieldBase<
  Options extends readonly string[],
  Multiple extends boolean,
  State extends FieldState,
> = FieldLike<
  SelectValue<Options, Multiple>,
  SelectValue<Options, Multiple>,
  SelectValue<Options, Multiple>,
  SelectMeta<Options, Multiple>,
  State
>;

export function selectField<const Options extends readonly string[]>(
  options: Options,
): SelectField<Options> {
  return makeSelectField({ options, multiple: false }, defaultFieldState);
}

function makeSelectField<
  Options extends readonly string[],
  Multiple extends boolean,
  State extends FieldState,
>(
  options: SelectOptions<Options, Multiple>,
  state: State,
): SelectField<Options, Multiple, State> {
  const field: SelectFieldCore<Options, Multiple, State> = {
    ...createField({
      meta: {
        type: "Select",
        ui: (options.multiple ? "MultiSelect" : "Select") as SelectMeta<
          Options,
          Multiple
        >["ui"],
        options: options.options,
        isMultiple: options.multiple,
      },
      state,
      schemas: sameSchemas(() => buildSelectSchema(options)),
    }),
    multiple: function <
      TThis extends SelectFieldBase<Options, Multiple, FieldState>,
    >(this: TThis) {
      return makeSelectField(
        { ...options, multiple: true },
        this.state as FieldStateOf<TThis>,
      );
    },
  };

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeSelectField(options, nextState) as WithFieldState<
        SelectFieldCore<Options, Multiple, State>,
        NextState
      >,
  });
}

function buildSelectSchema<
  Options extends readonly string[],
  Multiple extends boolean,
>(options: SelectOptions<Options, Multiple>) {
  const literal = z.literal(
    options.options.length ? options.options : [""],
  ) as z.ZodType<Options[number]>;

  return (
    options.multiple ? z.array(literal) : literal
  ) as z.ZodType<SelectValue<Options, Multiple>>;
}
