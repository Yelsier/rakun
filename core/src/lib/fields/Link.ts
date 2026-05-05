import z from "zod";

import type { EncodedField } from "./Field";
import { Field } from "./Field";
import { Id } from "../utils/id";
import type { FieldHKT } from "../types";
import { getDefaultOutputSchema } from "../utils/getSchemas";

const LinkSchema = z.object({
  routeId: Id,
  contentTypeId: Id,
});

const LinkOutputSchema = z.string();

type LinkSchema = typeof LinkSchema;

type LinkOutputSchema = typeof LinkOutputSchema;

interface LinkFieldHKT extends FieldHKT {
  type: LinkField<this["args"][1], this["args"][2], this["args"][3]>;
}

export class LinkField<
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends "api" | "manager" | "all" = "all",
> extends Field<
  LinkFieldHKT,
  LinkSchema,
  LinkOutputSchema,
  TRequired,
  TTranslatable,
  TVisibility
> {
  constructor() {
    super({
      config: { ui: "Link", type: "Link" },
      schema: LinkSchema,
    });
  }

  protected override getBaseOutputSchema() {
    return getDefaultOutputSchema<LinkOutputSchema, TRequired>(
      LinkOutputSchema,
      this.isRequired,
    );
  }
}

export type EncodedLinkField = EncodedField;

export type LinkfieldValue = z.infer<LinkSchema>;
