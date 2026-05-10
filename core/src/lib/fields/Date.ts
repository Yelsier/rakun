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

export const dateUis = ["Date", "DateTime", "Time"] as const;

export type DateUI = (typeof dateUis)[number];

type DateValue<Ui extends DateUI> = Ui extends "Time" ? string : Date;

export type DateMeta<Ui extends DateUI = DateUI> = {
  type: "Date";
  ui: Ui;
};

type DateOptions<Ui extends DateUI> = {
  ui: Ui;
};

export type DateField<
  Ui extends DateUI = "Date",
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<DateFieldCore<Ui, State>>;

type DateFieldCore<
  Ui extends DateUI,
  State extends FieldState,
> = DateFieldBase<Ui, State> & {
  type: <
    TThis extends DateFieldBase<Ui, FieldState>,
    NextUi extends DateUI,
  >(
    this: TThis,
    ui: NextUi,
  ) => DateField<NextUi, FieldStateOf<TThis>>;
};

type DateFieldBase<
  Ui extends DateUI,
  State extends FieldState,
> = FieldLike<
  DateValue<Ui>,
  DateValue<Ui>,
  DateValue<Ui>,
  DateMeta<Ui>,
  State
>;

export function dateField(): DateField {
  return makeDateField({ ui: "Date" }, defaultFieldState);
}

export type EncodedDateField = EncodedField;

function makeDateField<Ui extends DateUI, State extends FieldState>(
  options: DateOptions<Ui>,
  state: State,
): DateField<Ui, State> {
  const field: DateFieldCore<Ui, State> = {
    ...createField({
      meta: { type: "Date", ui: options.ui },
      state,
      schemas: sameSchemas(() => buildDateSchema(options.ui)),
    }),
    type: function <
      TThis extends DateFieldBase<Ui, FieldState>,
      NextUi extends DateUI,
    >(this: TThis, ui: NextUi) {
      return makeDateField({ ui }, this.state as FieldStateOf<TThis>);
    },
  };

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeDateField(options, nextState) as WithFieldState<
        DateFieldCore<Ui, State>,
        NextState
      >,
  });
}

function buildDateSchema<Ui extends DateUI>(ui: Ui): z.ZodType<DateValue<Ui>> {
  if (ui === "Time") {
    return z.iso.time() as unknown as z.ZodType<DateValue<Ui>>;
  }

  return z.date() as unknown as z.ZodType<DateValue<Ui>>;
}
