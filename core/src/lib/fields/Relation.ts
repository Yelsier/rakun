import z from "zod";

import {
  createField,
  defaultFieldState,
  type EncodedField,
  type DefaultFieldState,
  type FieldLike,
  type FieldOutput,
  type FieldState,
  type FieldStateOf,
  type FieldWithModifiers,
  type PopulatableFieldLike,
  type SetRequired,
  type WithFieldState,
  withFieldModifiers,
} from "./Field";
import type { EncodedContentType } from "../ContentType";
import { simpleListField, type SimpleListField } from "./SimpleList";
import { Id } from "../utils/id";

export type OnlyType = "existing" | "new" | undefined;

export type ContentTypeLike<Name extends string = string> = {
  name: Name;
  getInputSchema: () => z.ZodTypeAny;
  getOutputSchema: () => z.ZodTypeAny;
  getOutputSchemaWithoutIterators?: () => z.ZodTypeAny;
  getPopulatedSchema?: () => z.ZodTypeAny;
};

type ContentTypeInput<CT extends ContentTypeLike> = z.infer<
  ReturnType<CT["getInputSchema"]>
>;

type ContentTypeOutputSchema<CT extends ContentTypeLike> = CT extends {
  getOutputSchemaWithoutIterators: () => infer Schema extends z.ZodTypeAny;
}
  ? Schema
  : ReturnType<CT["getOutputSchema"]>;

type ContentTypePopulatedSchema<CT extends ContentTypeLike> = CT extends {
  getPopulatedSchema: () => infer Schema extends z.ZodTypeAny;
}
  ? Schema
  : ContentTypeOutputSchema<CT>;

type ContentTypeOutput<CT extends ContentTypeLike> = z.infer<
  ContentTypeOutputSchema<CT>
>;

type ContentTypePopulated<CT extends ContentTypeLike> = z.infer<
  ContentTypePopulatedSchema<CT>
>;

export type RelationExisting<Name extends string = string> = {
  type: "existing";
  _id: string;
  contentType: Name;
};

export type RelationNew<Data = unknown> = {
  type: "new";
  data: Data;
};

export type RelationFieldValue = RelationExisting | RelationNew<unknown>;
export type RelationExistingDefaltData = RelationExisting;
export type RelationNewDefaultData<S> = RelationNew<S>;

type RelationValue<
  CT extends ContentTypeLike,
  Only extends OnlyType,
> = Only extends "new"
  ? RelationNew<ContentTypeInput<CT>>
  : RelationExisting<CT["name"]>;

export type RelationMeta<
  Name extends string = string,
  Only extends OnlyType = OnlyType,
> = {
  type: "Relation";
  ui: "ContentType";
  contentType: Name;
  only?: Only;
};

export type EncodedRelationField = EncodedField & {
  contentType: EncodedContentType;
  only?: OnlyType;
};

type RelationOptions<CT extends ContentTypeLike, Only extends OnlyType> = {
  contentType: CT;
  only?: Only;
};

export type RelationField<
  CT extends ContentTypeLike = ContentTypeLike,
  Only extends OnlyType = undefined,
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<RelationFieldCore<CT, Only, State>>;

type RelationFieldCore<
  CT extends ContentTypeLike,
  Only extends OnlyType,
  State extends FieldState,
> = RelationFieldBase<CT, Only, State> &
  PopulatableFieldLike<ContentTypePopulated<CT>, State> & {
    contentType: CT;
    only?: Only;
    multiple: <
      TThis extends RelationFieldBase<CT, Only, FieldState>,
    >(
      this: TThis,
    ) => SimpleListField<
      RelationField<CT, Only, SetRequired<DefaultFieldState>>,
      FieldStateOf<TThis>
    >;
  };

type RelationFieldBase<
  CT extends ContentTypeLike,
  Only extends OnlyType,
  State extends FieldState,
> = FieldLike<
  RelationValue<CT, Only>,
  RelationValue<CT, Only>,
  ContentTypeOutput<CT>,
  RelationMeta<CT["name"], Only>,
  State
>;

export function relationField<
  CT extends ContentTypeLike,
  const Only extends OnlyType = undefined,
>(contentType: CT, only?: Only): RelationField<CT, Only> {
  return makeRelationField({ contentType, only }, defaultFieldState);
}

function makeRelationField<
  CT extends ContentTypeLike,
  Only extends OnlyType,
  State extends FieldState,
>(
  options: RelationOptions<CT, Only>,
  state: State,
): RelationField<CT, Only, State> {
  const field: RelationFieldCore<CT, Only, State> = {
    ...createField<
      RelationValue<CT, Only>,
      RelationValue<CT, Only>,
      ContentTypeOutput<CT>,
      RelationMeta<CT["name"], Only>,
      State
    >({
      meta: {
        type: "Relation",
        ui: "ContentType",
        contentType: options.contentType.name,
        only: options.only,
      },
      state,
      schemas: {
        input: () => buildRelationSchema(options),
        db: () => buildRelationSchema(options),
        output: () =>
          getContentTypeOutputSchema(options.contentType) as z.ZodType<
            ContentTypeOutput<CT>
          >,
      },
    }),
    getPopulatedSchema: () =>
      applyRelationOutputPresence(
        getContentTypePopulatedSchema(options.contentType),
        state,
      ) as z.ZodType<FieldOutput<ContentTypePopulated<CT>, State>>,
    contentType: options.contentType,
    only: options.only,
    multiple: function <
      TThis extends RelationFieldBase<CT, Only, FieldState>,
    >(this: TThis) {
      const relation = makeRelationField(
        options,
        defaultFieldState,
      ).required();
      let list: unknown = simpleListField(relation);

      if (this.state.required) {
        list = (list as SimpleListField).required();
      }

      if (this.state.translatable) {
        list = (list as SimpleListField).translatable();
      }

      if (this.state.visibility === "api") {
        list = (list as SimpleListField).apiOnly();
      }

      if (this.state.visibility === "manager") {
        list = (list as SimpleListField).managerOnly();
      }

      if (this.state.dynamic === false) {
        list = (list as SimpleListField).noDynamic();
      }

      return list as SimpleListField<
        RelationField<CT, Only, SetRequired<DefaultFieldState>>,
        FieldStateOf<TThis>
      >;
    },
  };

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeRelationField(options, nextState) as WithFieldState<
        RelationFieldCore<CT, Only, State>,
        NextState
      >,
  });
}

function buildRelationSchema<
  CT extends ContentTypeLike,
  Only extends OnlyType,
>(options: RelationOptions<CT, Only>) {
  const newSchema = z.object({
    type: z.literal("new"),
    data: options.contentType.getInputSchema(),
  });

  const existingSchema = z.object({
    type: z.literal("existing"),
    _id: Id,
    contentType: z.literal(options.contentType.name),
  });

  if (options.only === "new") {
    return newSchema as unknown as z.ZodType<RelationValue<CT, Only>>;
  }

  if (options.only === "existing") {
    return existingSchema as unknown as z.ZodType<RelationValue<CT, Only>>;
  }

  return z.discriminatedUnion("type", [
    newSchema,
    existingSchema,
  ]) as unknown as z.ZodType<RelationValue<CT, Only>>;
}

function getContentTypeOutputSchema<CT extends ContentTypeLike>(
  contentType: CT,
) {
  return (
    contentType.getOutputSchemaWithoutIterators?.() ??
    contentType.getOutputSchema()
  ) as ContentTypeOutputSchema<CT>;
}

function getContentTypePopulatedSchema<CT extends ContentTypeLike>(
  contentType: CT,
) {
  return (
    contentType.getPopulatedSchema?.() ?? getContentTypeOutputSchema(contentType)
  ) as ContentTypePopulatedSchema<CT>;
}

function applyRelationOutputPresence<Value, State extends FieldState>(
  schema: z.ZodType<Value>,
  state: State,
) {
  return state.required ? schema : schema.optional();
}
