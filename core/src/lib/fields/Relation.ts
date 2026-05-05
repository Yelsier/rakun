import z from "zod";

import type { EncodedField } from "./Field";
import { Field } from "./Field";
import { SimpleListField } from "./SimpleList";
import type ContentType from "../ContentType";
import type {
  FieldHKT,
  If,
  getInputTypeWithModifiers,
  getTypeWithModifiers,
  getOutputTypeWithModifiers,
} from "../types";
import { SelfRelationField } from "./SelfRelation";
import {
  getDefaultInputSchema,
  getDefaultOutputSchema,
  getDefaultSchema,
} from "../utils/getSchemas";
import { Id } from "../utils/id";
import type { EncodedContentType } from "../ContentType";

export type OnlyType = "existing" | "new" | undefined;

type isNew<X extends OnlyType> = X extends "new" ? true : false;

interface RelationFieldHKT<
  CT extends ContentType,
  X extends OnlyType,
  S extends ReturnType<CT["getInputSchema"]>,
  Sout extends ReturnType<CT["getOutputSchema"]>,
> extends FieldHKT {
  type: RelationField<
    CT,
    X,
    S,
    Sout,
    this["args"][1],
    this["args"][2],
    this["args"][3]
  >;
}

type NewType<S extends z.ZodTypeAny> = z.ZodObject<
  {
    type: z.ZodLiteral<"new">;
    data: S;
  },
  z.core.$strip
>;

type ExistingType = z.ZodObject<
  {
    type: z.ZodLiteral<"existing">;
    _id: z.ZodString;
    contentType: z.ZodLiteral<string>;
  },
  z.core.$strip
>;

type SchemaType<X extends OnlyType, S extends z.ZodTypeAny> = If<
  isNew<X>,
  NewType<S>,
  ExistingType
>;

export class RelationField<
  CT extends ContentType = ContentType,
  X extends OnlyType = OnlyType,
  S extends ReturnType<CT["getInputSchema"]> = ReturnType<CT["getInputSchema"]>,
  Sout extends ReturnType<CT["getOutputSchemaWithoutIterators"]> = ReturnType<
    CT["getOutputSchemaWithoutIterators"]
  >,
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends "api" | "manager" | "all" = "all",
> extends Field<
  RelationFieldHKT<CT, X, S, Sout>,
  SchemaType<X, S>,
  Sout,
  TRequired,
  TTranslatable,
  TVisibility
> {
  contentType: CT;
  private only?: X;

  constructor(contentType: CT, only?: X) {
    super({
      config: { ui: "ContentType", type: "Relation" },
      schema: contentType.getInputSchema() as unknown as SchemaType<X, S>,
    });
    this.contentType = contentType;
    this.only = only;
  }

  setSelfRelateds() {
    Object.values(this.contentType.fields).forEach((field) => {
      if (field instanceof SelfRelationField) {
        field.setContentType(this.contentType);
      }
    });
  }

  private getSchemaType() {
    const newSchema = z.object({
      type: z.literal("new"),
      data: this.schema,
    });

    const existingSchema = z.object({
      type: z.literal("existing"),
      _id: Id,
      contentType: z.literal(this.contentType.name),
    });

    const bothSchema = z.discriminatedUnion("type", [
      newSchema,
      existingSchema,
    ]);

    return (
      this.only === "new"
        ? newSchema
        : this.only === "existing"
          ? existingSchema
          : bothSchema
    ) as SchemaType<X, S>;
  }

  protected override getBaseInputSchema() {
    return getDefaultInputSchema(
      this.getSchemaType(),
      this.isRequired,
      this.isTranslatable,
    ) as getInputTypeWithModifiers<SchemaType<X, S>, TRequired, TTranslatable>;
  }

  protected override getBaseSchema() {
    return getDefaultSchema(
      this.getSchemaType(),
      this.isRequired,
      this.isTranslatable,
    ) as getTypeWithModifiers<SchemaType<X, S>, TRequired, TTranslatable>;
  }

  protected override getBaseOutputSchema() {
    return getDefaultOutputSchema(
      this.contentType.getOutputSchemaWithoutIterators() as Sout,
      this.isRequired,
    ) as getOutputTypeWithModifiers<Sout, TRequired>;
  }

  getPopulatedSchema() {
    return getDefaultOutputSchema(
      this.schema as Sout,
      this.isRequired,
    ) as getOutputTypeWithModifiers<Sout, TRequired>;
  }

  multiple() {
    const relation = new RelationField<CT, X>(
      this.contentType,
      this.only,
    ).required();
    const list = new SimpleListField(relation);

    if (this.isRequired) {
      list.required();
    }

    if (this.isTranslatable) {
      list.translatable();
    }

    if (this.visibility === "api") {
      list.apiOnly();
    }

    if (this.visibility === "manager") {
      list.managerOnly();
    }

    return list;
  }
}

export type EncodedRelationField = EncodedField & {
  contentType: EncodedContentType;
  only?: OnlyType;
};

export type RelationFieldValue = z.infer<ExistingType | NewType<z.ZodTypeAny>>;
export type RelationExistingDefaltData = z.infer<ExistingType>;
export type RelationNewDefaultData<S> = {
  type: "new";
  data: S;
};
