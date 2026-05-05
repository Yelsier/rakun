import z from "zod";

import type { EncodedField } from "./Field";
import { Field } from "./Field";
import type { FieldHKT } from "../types";

export const DateUI = z.enum(["Date", "DateTime", "Time"]);

export type DateUI = z.infer<typeof DateUI>;

interface DateFieldHKT<T extends DateUI> extends FieldHKT {
  type: DateField<T, this["args"][1], this["args"][2], this["args"][3]>;
}

export class DateField<
  TType extends DateUI = "Date",
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends "api" | "manager" | "all" = "all",
> extends Field<
  DateFieldHKT<TType>,
  TType extends "Time" ? z.ZodStringFormat : z.ZodDate,
  TType extends "Time" ? z.ZodStringFormat : z.ZodDate,
  TRequired,
  TTranslatable,
  TVisibility
> {
  constructor() {
    super({
      config: { ui: "Date", type: "Date" },
      schema: z.date() as TType extends "Time" ? z.ZodStringFormat : z.ZodDate,
    });
  }

  type<T extends DateUI>(ui: T) {
    this.config.ui = ui;

    if (ui === "DateTime") {
      this.schema = z.date() as TType extends "Time"
        ? z.ZodStringFormat
        : z.ZodDate;
    }

    if (ui === "Date") {
      this.schema = z.date() as TType extends "Time"
        ? z.ZodStringFormat
        : z.ZodDate;
    }

    if (ui === "Time") {
      this.schema = z.iso.time() as TType extends "Time"
        ? z.ZodStringFormat
        : z.ZodDate;
    }

    return this;
  }
}

export type EncodedDateField = EncodedField;
