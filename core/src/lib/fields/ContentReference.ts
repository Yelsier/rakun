import z from "zod";

import {
  createField,
  defaultFieldState,
  type EncodedField,
  sameSchemas,
  type DefaultFieldState,
  type FieldLike,
  type FieldState,
  type FieldStateOf,
  type FieldWithModifiers,
  type WithFieldState,
  withFieldModifiers,
} from "./Field";
import type { EncodedContentType } from "../ContentType";
import { Id } from "../utils/id";

type ContentReferenceValue<Multiple extends boolean> = Multiple extends true
  ? string[]
  : string;

export type ContentReferenceMeta<
  Name extends string = string,
  Multiple extends boolean = boolean,
> = {
  type: "ContentReference";
  ui: Multiple extends true ? "ContentTypeMultiSelect" : "ContentTypeSelect";
  contentType: Name;
  isMultiple: Multiple;
};

export type EncodedContentReferenceField = EncodedField & {
  contentType: Pick<EncodedContentType, "name" | "listFields">;
  isMultiple: boolean;
};

type ContentReferenceOptions<
  Name extends string,
  Multiple extends boolean,
> = {
  contentType: Name;
  multiple: Multiple;
};

export type ContentReferenceField<
  Name extends string = string,
  Multiple extends boolean = false,
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<
  ContentReferenceFieldCore<Name, Multiple, State>
>;

type ContentReferenceFieldCore<
  Name extends string,
  Multiple extends boolean,
  State extends FieldState,
> = ContentReferenceFieldBase<Name, Multiple, State> & {
  multiple: <
    TThis extends ContentReferenceFieldBase<Name, Multiple, FieldState>,
  >(
    this: TThis,
  ) => ContentReferenceField<Name, true, FieldStateOf<TThis>>;
};

type ContentReferenceFieldBase<
  Name extends string,
  Multiple extends boolean,
  State extends FieldState,
> = FieldLike<
  ContentReferenceValue<Multiple>,
  ContentReferenceValue<Multiple>,
  ContentReferenceValue<Multiple>,
  ContentReferenceMeta<Name, Multiple>,
  State
>;

export function contentReferenceField<const Name extends string>(
  contentType: Name,
): ContentReferenceField<Name> {
  return makeContentReferenceField(
    { contentType, multiple: false },
    defaultFieldState,
  );
}

function makeContentReferenceField<
  Name extends string,
  Multiple extends boolean,
  State extends FieldState,
>(
  options: ContentReferenceOptions<Name, Multiple>,
  state: State,
): ContentReferenceField<Name, Multiple, State> {
  const field: ContentReferenceFieldCore<Name, Multiple, State> = {
    ...createField({
      meta: {
        type: "ContentReference",
        ui: (options.multiple
          ? "ContentTypeMultiSelect"
          : "ContentTypeSelect") as ContentReferenceMeta<
          Name,
          Multiple
        >["ui"],
        contentType: options.contentType,
        isMultiple: options.multiple,
      },
      state,
      schemas: sameSchemas(() => buildContentReferenceSchema(options.multiple)),
    }),
    multiple: function <
      TThis extends ContentReferenceFieldBase<Name, Multiple, FieldState>,
    >(this: TThis) {
      return makeContentReferenceField(
        { ...options, multiple: true },
        this.state as FieldStateOf<TThis>,
      );
    },
  };

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeContentReferenceField(options, nextState) as WithFieldState<
        ContentReferenceFieldCore<Name, Multiple, State>,
        NextState
      >,
  });
}

function buildContentReferenceSchema<Multiple extends boolean>(
  multiple: Multiple,
) {
  return (multiple ? z.array(Id) : Id) as unknown as z.ZodType<
    ContentReferenceValue<Multiple>
  >;
}
