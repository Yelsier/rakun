import z from "zod";

import type { EncodedField } from "./Field";
import { Field } from "./Field";
import type ContentType from "../ContentType";
import { Id } from "../utils/id";
import type { FieldHKT, Visibility } from "../types";

const SelfRelationSchema = z.object({
  type: z.literal("self"),
  _id: Id,
  contentType: z.string(),
});

type SelfRelationSchema = typeof SelfRelationSchema;

interface SelfRelationFieldHKT extends FieldHKT {
  type: SelfRelationField<this["args"][1], this["args"][2], this["args"][3]>;
}

export class SelfRelationField<
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends Visibility = "all",
> extends Field<
  SelfRelationFieldHKT,
  SelfRelationSchema,
  SelfRelationSchema,
  TRequired,
  TTranslatable,
  TVisibility
> {
  constructor() {
    super({
      config: { ui: "SelfRelation", type: "Relation" },
      schema: SelfRelationSchema,
    });
  }

  setContentType(contentType: ContentType) {
    this.schema = z.object({
      type: z.literal("self"),
      _id: Id,
      contentType: z.literal(contentType.name),
    }) as unknown as SelfRelationSchema;
  }
}

export type EncodedSelfRelationField = EncodedField;
