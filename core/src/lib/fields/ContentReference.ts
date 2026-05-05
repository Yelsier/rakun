import z from "zod";

import type { EncodedField } from "./Field";
import { Field } from "./Field";
import { Id } from "../utils/id";
import type { If, FieldHKT, Visibility } from "../types";
import type { EncodedContentType } from "../ContentType";

interface ContentReferenceFieldHKT<
  N extends string,
  M extends boolean,
> extends FieldHKT {
  type: ContentReferenceField<
    N,
    M,
    If<M, z.ZodArray<typeof Id>, typeof Id>,
    this["args"][1],
    this["args"][2],
    this["args"][3]
  >;
}

export class ContentReferenceField<
  N extends string = string,
  M extends boolean = false,
  S extends If<M, z.ZodArray<typeof Id>, typeof Id> = If<
    M,
    z.ZodArray<typeof Id>,
    typeof Id
  >,
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends Visibility = "all",
> extends Field<
  ContentReferenceFieldHKT<N, M>,
  S,
  S,
  TRequired,
  TTranslatable,
  TVisibility
> {
  contentType: N;
  isMultiple: M = false as M;

  constructor(contentType: N) {
    super({
      config: { ui: "ContentTypeSelect", type: "ContentReference" },
      schema: Id as S,
    });
    this.contentType = contentType;
  }

  multiple() {
    this.schema = z.array(Id) as S;
    this.config.ui = "ContentTypeMultiSelect";
    this.isMultiple = true as M;

    return this as ContentReferenceField<
      N,
      true,
      z.ZodArray<typeof Id>,
      TRequired,
      TTranslatable,
      TVisibility
    >;
  }
}

export type EncodedContentReferenceField = EncodedField & {
  contentType: Pick<EncodedContentType, "name" | "listFields">;
  isMultiple: boolean;
};
