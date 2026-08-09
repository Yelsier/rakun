import z from "zod";

import {
  createField,
  defaultFieldState,
  type EncodedField,
  sameSchemas,
  type DefaultFieldState,
  type FieldStateOf,
  type FieldLike,
  type FieldState,
  type FieldWithModifiers,
  type WithFieldState,
  withFieldModifiers,
} from "./Field";
import { Id } from "../utils/id";
import { slugify } from "../utils/slugify";

export const stringUis = [
  "Text",
  "Textarea",
  "RichText",
  "Email",
  "Slug",
  "Password",
  "Id",
  "Url",
] as const;

export type StringUI = (typeof stringUis)[number];

export const seoStringFields = [
  "title",
  "description",
  "canonicalUrl",
  "imageAlt",
  "openGraphTitle",
  "openGraphDescription",
  "openGraphUrl",
  "openGraphSiteName",
  "openGraphImageAlt",
  "twitterTitle",
  "twitterDescription",
  "twitterImageAlt",
] as const;

export type SeoStringField = (typeof seoStringFields)[number];

type StringValue<Ui extends StringUI> = Ui extends "RichText"
  ? Record<string, unknown>
  : string;

export type StringMeta<Ui extends StringUI = StringUI> = {
  type: "String";
  ui: Ui;
  minLength?: number;
  maxLength?: number;
  seo?: SeoStringField;
};

type StringOptions<Ui extends StringUI> = {
  ui: Ui;
  minLength?: number;
  maxLength?: number;
  seo?: SeoStringField;
};

export type StringField<
  Ui extends StringUI = "Text",
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<StringFieldCore<Ui, State>>;

type StringFieldCore<
  Ui extends StringUI,
  State extends FieldState,
> = StringFieldBase<Ui, State> & {
  type: <
    TThis extends StringFieldBase<Ui, FieldState>,
    NextUi extends StringUI,
  >(
    this: TThis,
    ui: NextUi,
  ) => StringField<NextUi, FieldStateOf<TThis>>;
  min: <TThis extends StringFieldBase<Ui, FieldState>>(
    this: TThis,
    length: number,
  ) => StringField<Ui, FieldStateOf<TThis>>;
  max: <TThis extends StringFieldBase<Ui, FieldState>>(
    this: TThis,
    length: number,
  ) => StringField<Ui, FieldStateOf<TThis>>;
  seo: <TThis extends StringFieldBase<Ui, FieldState>>(
    this: Ui extends "RichText" ? never : TThis,
    field: SeoStringField,
  ) => StringField<Ui, FieldStateOf<TThis>>;
};

type StringFieldBase<
  Ui extends StringUI,
  State extends FieldState,
> = FieldLike<
  StringValue<Ui>,
  StringValue<Ui>,
  StringValue<Ui>,
  StringMeta<Ui>,
  State
>;

export function stringField(): StringField {
  return makeStringField({ ui: "Text" }, defaultFieldState);
}

export type EncodedStringField = EncodedField;

function makeStringField<Ui extends StringUI, State extends FieldState>(
  options: StringOptions<Ui>,
  state: State,
): StringField<Ui, State> {
  const meta = {
    type: "String",
    ui: options.ui,
    minLength: options.minLength,
    maxLength: options.maxLength,
    seo: options.seo,
  } as const satisfies StringMeta<Ui>;

  const field: StringFieldCore<Ui, State> = {
    ...createField({
      meta,
      state,
      schemas: sameSchemas(() => buildStringSchema(options)),
    }),
    type: function <
      TThis extends StringFieldBase<Ui, FieldState>,
      NextUi extends StringUI,
    >(this: TThis, ui: NextUi) {
      if (ui === "RichText" && options.seo) {
        throw new Error("RichText fields cannot initialize string SEO fields.");
      }

      return makeStringField(
        { ...options, ui },
        this.state as FieldStateOf<TThis>,
      );
    },
    min: function <TThis extends StringFieldBase<Ui, FieldState>>(
      this: TThis,
      length: number,
    ) {
      return makeStringField(
        { ...options, minLength: length },
        this.state as FieldStateOf<TThis>,
      );
    },
    max: function <TThis extends StringFieldBase<Ui, FieldState>>(
      this: TThis,
      length: number,
    ) {
      return makeStringField(
        { ...options, maxLength: length },
        this.state as FieldStateOf<TThis>,
      );
    },
    seo: function <TThis extends StringFieldBase<Ui, FieldState>>(
      this: TThis,
      seo: SeoStringField,
    ) {
      if (options.ui === "RichText") {
        throw new Error("RichText fields cannot initialize string SEO fields.");
      }

      return makeStringField(
        { ...options, seo },
        this.state as FieldStateOf<TThis>,
      );
    },
  };

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeStringField(options, nextState) as WithFieldState<
        StringFieldCore<Ui, State>,
        NextState
      >,
  });
}

function buildStringSchema<Ui extends StringUI>(
  options: StringOptions<Ui>,
): z.ZodType<StringValue<Ui>> {
  if (options.ui === "RichText") {
    return z
      .record(z.string(), z.unknown()) as unknown as z.ZodType<
      StringValue<Ui>
    >;
  }

  let schema =
    options.ui === "Email"
      ? z.email()
      : options.ui === "Url"
        ? z.url()
        : z.string();

  if (options.ui === "Id") {
    schema = Id;
  }

  if (options.minLength !== undefined) {
    schema = schema.min(options.minLength);
  }

  if (options.maxLength !== undefined) {
    schema = schema.max(options.maxLength);
  }

  if (options.ui === "Slug") {
    return schema.transform(slugify) as unknown as z.ZodType<StringValue<Ui>>;
  }

  return schema as unknown as z.ZodType<StringValue<Ui>>;
}
