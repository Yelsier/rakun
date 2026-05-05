import z from "zod";

import type { EncodedField } from "./Field";
import { Field } from "./Field";
import type { FieldHKT, If, Visibility } from "../types";

interface SelectFieldHKT<
  L extends string[],
  M extends boolean,
> extends FieldHKT {
  type: SelectField<
    L,
    M,
    If<M, z.ZodArray<z.ZodLiteral<L[number]>>, z.ZodLiteral<L[number]>>,
    this["args"][1],
    this["args"][2],
    this["args"][3]
  >;
}

export class SelectField<
  const L extends string[] = string[],
  M extends boolean = false,
  S extends If<
    M,
    z.ZodArray<z.ZodLiteral<L[number]>>,
    z.ZodLiteral<L[number]>
  > = If<M, z.ZodArray<z.ZodLiteral<L[number]>>, z.ZodLiteral<L[number]>>,
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends Visibility = "all",
> extends Field<
  SelectFieldHKT<L, M>,
  S,
  S,
  TRequired,
  TTranslatable,
  TVisibility
> {
  options: L;
  isMultiple: M = false as M;
  constructor(options: L) {
    super({
      config: { ui: "Select", type: "Select" },
      schema: z.literal(options.length ? options : [""]) as S,
    });
    this.options = options;
  }

  multiple() {
    this.schema = z.array(z.literal(this.options)) as S;
    this.config.ui = "MultiSelect";
    this.isMultiple = true as M;
    return this as SelectField<
      L,
      true,
      z.ZodArray<z.ZodLiteral<L[number]>>,
      TRequired,
      TTranslatable,
      TVisibility
    >;
  }
}

export type EncodedSelectField = EncodedField & {
  options: string[];
  isMultiple: boolean;
};
