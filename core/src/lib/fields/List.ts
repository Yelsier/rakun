import z from "zod";

import type { EncodedField } from "./Field";
import { Field } from "./Field";
import type { FieldHKT, getRequiredType } from "../types";

export type Entry = {
  name: string;
  field: Field<any, any, any, any, any, any>;
};

export interface ListFieldHKT<
  F extends Entry[],
  S extends z.ZodArray<
    z.ZodObject<
      {
        name: z.ZodString;
        value: z.ZodUnion<
          readonly [ReturnType<F[number]["field"]["getSchema"]>]
        >;
      },
      z.core.$strip
    >
  >,
  Sout extends z.ZodArray<
    z.ZodObject<
      {
        name: z.ZodString;
        value: z.ZodUnion<
          readonly [ReturnType<F[number]["field"]["getOutputSchema"]>]
        >;
      },
      z.core.$strip
    >
  >,
> extends FieldHKT {
  type: ListField<
    F,
    S,
    Sout,
    this["args"][1],
    this["args"][2],
    this["args"][3]
  >;
}

export class ListField<
  F extends Entry[] = [],
  S extends z.ZodArray<
    z.ZodObject<
      {
        name: z.ZodString;
        value: z.ZodUnion<
          readonly [ReturnType<F[number]["field"]["getSchema"]>]
        >;
      },
      z.core.$strip
    >
  > = z.ZodArray<
    z.ZodObject<
      {
        name: z.ZodString;
        value: z.ZodUnion<
          readonly [ReturnType<F[number]["field"]["getSchema"]>]
        >;
      },
      z.core.$strip
    >
  >,
  Sout extends z.ZodArray<
    z.ZodObject<
      {
        name: z.ZodString;
        value: z.ZodUnion<
          readonly [ReturnType<F[number]["field"]["getOutputSchema"]>]
        >;
      },
      z.core.$strip
    >
  > = z.ZodArray<
    z.ZodObject<
      {
        name: z.ZodString;
        value: z.ZodUnion<
          readonly [ReturnType<F[number]["field"]["getOutputSchema"]>]
        >;
      },
      z.core.$strip
    >
  >,
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends "api" | "manager" | "all" = "all",
  THKT extends FieldHKT = ListFieldHKT<F, S, Sout>,
> extends Field<THKT, S, Sout, TRequired, TTranslatable, TVisibility> {
  fields: F;

  constructor(fields: F) {
    super({
      config: { ui: "List", type: "List" },
      schema: z.array(
        z.object({
          name: z.string(),
          value: z.union(fields.map((f) => f.field.getSchema())),
        }),
      ) as unknown as S,
    });
    this.fields = fields;
  }

  protected override getBaseOutputSchema() {
    return z.array(
      z.object({
        name: z.string(),
        value: z.union(
          this.fields.map((f) => f.field.getOutputSchema()) as unknown as [
            ReturnType<F[number]["field"]["getOutputSchema"]>,
          ],
        ),
      }),
    ) as unknown as getRequiredType<Sout, TRequired>;
  }
}

export type EncodedListFieldItem = {
  name: string;
  field: EncodedField;
};

export type EncodedListField = EncodedField & {
  fields: EncodedListFieldItem[];
};

export type ListFieldValueItem<S> = {
  name: string;
  value: S;
};
