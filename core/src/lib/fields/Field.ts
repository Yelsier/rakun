import { z } from "zod";

import type { Apply, FieldHKT, HKT, Visibility } from "../types";
import {
  getDefaultSchema,
  getDefaultManagerSchema,
  getDefaultApiSchema,
  getDefaultOutputSchema,
  getDefaultInputSchema,
} from "../utils/getSchemas";
import { EncodedBooleanField } from "./Boolean";
import { EncodedDateField } from "./Date";
import { EncodedFileField } from "./File";
import { EncodedLinkField } from "./Link";
import { EncodedListField } from "./List";
import { EncodedNumberField } from "./Number";
import { EncodedContentReferenceField } from "./ContentReference";
import { EncodedRelationField } from "./Relation";
import { EncodedSelectField } from "./Select";
import { EncodedSelfRelationField } from "./SelfRelation";
import { EncodedSimpleListField } from "./SimpleList";
import { EncodedStringField } from "./String";

export const FieldUIType = z.enum([
  "Text",
  "Number",
  "Boolean",
  "Date",
  "Textarea",
  "RichText",
  "Select",
  "MultiSelect",
  "Email",
  "Slug",
  "ContentType",
  "ContentTypeSelect",
  "ContentTypeMultiSelect",
  "List",
  "Password",
  "SelfRelation",
  "Id",
  "Url",
  "Link",
  "DateTime",
  "Time",
  "Iterator",
  "SimpleList",
  "File",
]);

export type FieldUIType = z.infer<typeof FieldUIType>;

export const FieldType = z.enum([
  "String",
  "Select",
  "Relation",
  "Number",
  "Boolean",
  "List",
  "Link",
  "Date",
  "File",
  "ContentReference",
]);

export type FieldType = z.infer<typeof FieldType>;

export abstract class Field<
  T extends HKT<unknown[]> = FieldHKT,
  S extends z.ZodTypeAny = z.ZodTypeAny,
  Sout extends z.ZodTypeAny = S,
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends Visibility = "all",
> {
  protected config: {
    ui: FieldUIType;
    type: FieldType;
  };
  protected isRequired: boolean = false;
  protected isTranslatable: boolean = false;
  protected schema: S;
  protected visibility: Visibility = "all";

  constructor(params: {
    config: { ui: FieldUIType; type: FieldType };
    schema: S;
  }) {
    this.config = params.config;
    this.schema = params.schema;
  }

  required() {
    this.isRequired = true;
    return this as Apply<T, [S, true, TTranslatable, TVisibility]>;
  }

  translatable() {
    this.isTranslatable = true;
    return this as Apply<T, [S, TRequired, true, TVisibility]>;
  }

  apiOnly() {
    this.visibility = "api";
    return this as Apply<T, [S, TRequired, TTranslatable, "api"]>;
  }

  managerOnly() {
    this.visibility = "manager";
    return this as Apply<T, [S, TRequired, TTranslatable, "manager"]>;
  }

  protected getBaseInputSchema() {
    return getDefaultInputSchema<S, TRequired, TTranslatable>(
      this.schema,
      this.isRequired as TRequired,
      this.isTranslatable as TTranslatable,
    );
  }

  protected getBaseSchema() {
    return getDefaultSchema<S, TRequired, TTranslatable>(
      this.schema,
      this.isRequired as TRequired,
      this.isTranslatable as TTranslatable,
    );
  }

  protected getBaseOutputSchema() {
    return getDefaultOutputSchema<Sout, TRequired>(
      this.schema as unknown as Sout,
      this.isRequired as TRequired,
    );
  }

  getInputSchema() {
    return getDefaultManagerSchema(this.visibility as TVisibility, () =>
      this.getBaseInputSchema(),
    );
  }

  getSchema() {
    return getDefaultManagerSchema(this.visibility as TVisibility, () =>
      this.getBaseSchema(),
    );
  }

  getOutputSchema() {
    return getDefaultApiSchema(this.visibility as TVisibility, () =>
      this.getBaseOutputSchema(),
    );
  }

  getIsRequired() {
    return this.isRequired;
  }

  getIsTranslatable() {
    return this.isTranslatable;
  }

  getVisibility(): TVisibility {
    return this.visibility as TVisibility;
  }

  getConfig() {
    return this.config;
  }
}

export type EncodedField = {
  config: {
    ui: FieldUIType;
    type: FieldType;
  };
  isRequired: boolean;
  isTranslatable: boolean;
  visibility: Visibility;
};

export type EncodedFieldUnknown =
  | EncodedBooleanField
  | EncodedDateField
  | EncodedFileField
  | EncodedLinkField
  | EncodedListField
  | EncodedNumberField
  | EncodedContentReferenceField
  | EncodedRelationField
  | EncodedSelectField
  | EncodedSelfRelationField
  | EncodedSimpleListField
  | EncodedStringField;
