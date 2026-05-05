import z from "zod";

import type { EncodedField } from "./Field";
import { Field } from "./Field";
import type { FieldHKT } from "../types";

interface NumberFieldHKT extends FieldHKT {
  type: NumberField<this["args"][1], this["args"][2], this["args"][3]>;
}

export class NumberField<
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends "api" | "manager" | "all" = "all",
> extends Field<
  NumberFieldHKT,
  z.ZodNumber,
  z.ZodNumber,
  TRequired,
  TTranslatable,
  TVisibility
> {
  minValue?: number;
  maxValue?: number;
  constructor() {
    super({
      config: { ui: "Number", type: "Number" },
      schema: z.number(),
    });
  }

  min(value: number, message?: string) {
    this.minValue = value;
    this.schema = this.schema.min(value, message);
    return this;
  }

  max(value: number, message?: string) {
    this.maxValue = value;
    this.schema = this.schema.max(value, message);
    return this;
  }
}

export type EncodedNumberField = EncodedField & {
  minValue?: number;
  maxValue?: number;
};
