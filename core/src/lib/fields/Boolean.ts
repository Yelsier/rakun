import z from "zod";

import type { EncodedField } from "./Field";
import { Field } from "./Field";
import type { FieldHKT } from "../types";

interface BooleanFieldHKT extends FieldHKT {
  type: BooleanField<this["args"][1], this["args"][2], this["args"][3]>;
}

export class BooleanField<
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends "api" | "manager" | "all" = "all",
> extends Field<
  BooleanFieldHKT,
  z.ZodBoolean,
  z.ZodBoolean,
  TRequired,
  TTranslatable,
  TVisibility
> {
  constructor() {
    super({
      config: { ui: "Boolean", type: "Boolean" },
      schema: z.boolean(),
    });
  }
}

export type EncodedBooleanField = EncodedField;
