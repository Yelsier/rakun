import z from "zod";

import type { EncodedField } from "./Field";
import { Field } from "./Field";
import type { FieldHKT, Visibility } from "../types";
import { Id } from "../utils/id";
import { slugify } from "../utils/slugify";

export const StringUI = z.enum([
  "Text",
  "Textarea",
  "RichText",
  "Email",
  "Slug",
  "Password",
  "Id",
  "Url",
]);

export type StringUI = z.infer<typeof StringUI>;

interface StringFieldHKT<T extends StringUI> extends FieldHKT {
  type: StringField<T, this["args"][1], this["args"][2], this["args"][3]>;
}

type SchemaType<T extends StringUI> = T extends "RichText"
  ? z.ZodRecord<z.ZodString, z.ZodAny>
  : z.ZodString;

export class StringField<
  TType extends StringUI = "Text",
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends Visibility = "all",
> extends Field<
  StringFieldHKT<TType>,
  SchemaType<TType>,
  SchemaType<TType>,
  TRequired,
  TTranslatable,
  TVisibility
> {
  constructor() {
    super({
      config: { ui: "Text", type: "String" },
      schema: z.string() as SchemaType<TType>,
    });
  }

  type<T extends StringUI>(ui: T) {
    type schema = TType extends "RichText"
      ? z.ZodRecord<z.ZodString, z.ZodAny>
      : z.ZodString;
    this.config.ui = ui;

    if (ui === "Email") {
      this.schema = z.email() as unknown as schema;
    }

    if (ui === "Url") {
      this.schema = z.url() as unknown as schema;
    }

    if (ui === "Id") {
      this.schema = Id as schema;
    }

    if (ui === "Slug") {
      this.schema = z.string().transform(slugify) as unknown as schema;
    }

    if (ui === "RichText") {
      this.schema = z.record(z.string(), z.any()) as schema;
    }

    return this as unknown as StringField<
      T,
      TRequired,
      TTranslatable,
      TVisibility
    >;
  }

  min(length: number) {
    if (this.config.ui === "RichText") {
      return this;
    }
    this.schema = (this.schema as z.ZodString).min(length) as SchemaType<TType>;
    return this;
  }

  max(length: number) {
    if (this.config.ui === "RichText") {
      return this;
    }

    this.schema = (this.schema as z.ZodString).max(length) as SchemaType<TType>;
    return this;
  }
}

export type EncodedStringField = EncodedField;
