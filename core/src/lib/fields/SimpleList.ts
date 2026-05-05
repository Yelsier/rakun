/* eslint-disable @typescript-eslint/no-explicit-any */
import z from "zod";

import type { EncodedField } from "./Field";
import { Field } from "./Field";
import type { FieldHKT, getOutputTypeWithModifiers } from "../types";
import { getDefaultOutputSchema } from "../utils/getSchemas";

interface SimpleListFieldHKT<
  F extends Field<any, any, any, any, any, any>,
  S extends z.ZodArray<ReturnType<F["getSchema"]>>,
  Sout extends z.ZodArray<
    ReturnType<
      F extends { getPopulatedSchema: () => z.ZodTypeAny }
        ? F["getPopulatedSchema"]
        : F["getSchema"]
    >
  >,
> extends FieldHKT {
  type: SimpleListField<
    F,
    S,
    Sout,
    this["args"][1],
    this["args"][2],
    this["args"][3]
  >;
}

export class SimpleListField<
  F extends Field<any, any, any, any, any, any>,
  S extends z.ZodArray<ReturnType<F["getSchema"]>> = z.ZodArray<
    ReturnType<F["getSchema"]>
  >,
  Sout extends z.ZodArray<
    ReturnType<
      F extends {
        getPopulatedSchema: () => z.ZodTypeAny;
      }
        ? F["getPopulatedSchema"]
        : F["getSchema"]
    >
  > = z.ZodArray<
    ReturnType<
      F extends {
        getPopulatedSchema: () => z.ZodTypeAny;
      }
        ? F["getPopulatedSchema"]
        : F["getSchema"]
    >
  >,
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends "api" | "manager" | "all" = "all",
> extends Field<
  SimpleListFieldHKT<F, S, Sout>,
  S,
  Sout,
  TRequired,
  TTranslatable,
  TVisibility
> {
  field: F;

  constructor(field: F) {
    super({
      config: { ui: "SimpleList", type: "List" },
      schema: z.array(field.getInputSchema()) as unknown as S,
    });
    this.field = field;
  }

  protected override getBaseOutputSchema() {
    return getDefaultOutputSchema<Sout, TRequired>(
      z.array(this.field.getOutputSchema()) as unknown as Sout,
      this.isRequired as TRequired,
    );
  }

  getPopulatedSchema() {
    return getDefaultOutputSchema(
      z.array(
        "getPopulatedSchema" in this.field &&
          typeof this.field.getPopulatedSchema === "function"
          ? this.field.getPopulatedSchema()
          : this.field.getSchema(),
      ) as Sout,
      this.isRequired,
    ) as getOutputTypeWithModifiers<Sout, TRequired>;
  }
}

export type EncodedSimpleListField = EncodedField & {
  field: EncodedField;
};
