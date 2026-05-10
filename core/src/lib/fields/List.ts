import z from "zod";

import {
  createField,
  defaultFieldState,
  type AnyFieldLike,
  type DefaultFieldState,
  type EncodedField,
  type EncodedFieldUnknown,
  type FieldLike,
  type FieldState,
  type FieldWithModifiers,
  type InferDb,
  type InferOutput,
  type WithFieldState,
  withFieldModifiers,
} from "./Field";

export type Entry<
  Name extends string = string,
  F extends AnyFieldLike = AnyFieldLike,
> = {
  name: Name;
  field: F;
};

export type EncodedListFieldItem = {
  name: string;
  field: EncodedFieldUnknown;
};

export type EncodedListField = EncodedField & {
  fields: EncodedListFieldItem[];
};

export type ListFieldValueItem<S> = {
  name: string;
  value: S;
};

type ListInputValue<Entries extends readonly Entry[]> = Array<{
  name: Entries[number]["name"];
  value: InferDb<Entries[number]["field"]>;
}>;

type ListOutputValue<Entries extends readonly Entry[]> = Array<{
  name: Entries[number]["name"];
  value: InferOutput<Entries[number]["field"]>;
}>;

export type ListMeta<Entries extends readonly Entry[] = readonly Entry[]> = {
  type: "List";
  ui: "List" | "Iterator";
  fields: {
    [K in keyof Entries]: Entries[K] extends Entry<infer Name, infer F>
      ? { name: Name; field: F["meta"] }
      : never;
  };
};

type ListOptions<Entries extends readonly Entry[]> = {
  fields: Entries;
  ui: "List" | "Iterator";
};

export type ListField<
  Entries extends readonly Entry[] = readonly Entry[],
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<ListFieldCore<Entries, State>>;

type ListFieldCore<
  Entries extends readonly Entry[],
  State extends FieldState,
> = FieldLike<
  ListInputValue<Entries>,
  ListInputValue<Entries>,
  ListOutputValue<Entries>,
  ListMeta<Entries>,
  State
> & {
  fields: Entries;
};

export function listField<const Entries extends readonly Entry[]>(
  fields: Entries,
): ListField<Entries> {
  return makeListField({ fields, ui: "List" }, defaultFieldState);
}

export function makeListField<
  Entries extends readonly Entry[],
  State extends FieldState,
>(options: ListOptions<Entries>, state: State): ListField<Entries, State> {
  const field: ListFieldCore<Entries, State> = createField({
    meta: {
      type: "List",
      ui: options.ui,
      fields: options.fields.map((entry) => ({
        name: entry.name,
        field: entry.field.meta,
      })) as ListMeta<Entries>["fields"],
    },
    state,
    schemas: {
      input: () => buildListDbSchema(options.fields),
      db: () => buildListDbSchema(options.fields),
      output: () => buildListOutputSchema(options.fields),
    },
  }) as ListFieldCore<Entries, State>;

  field.fields = options.fields;

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeListField(options, nextState) as WithFieldState<
        ListFieldCore<Entries, State>,
        NextState
      >,
  });
}

function buildListDbSchema<Entries extends readonly Entry[]>(fields: Entries) {
  const valueSchemas = fields.map((entry) =>
    entry.field.getSchema(),
  );

  return z.array(
    z.object({
      name: z.string(),
      value: unionSchemas(valueSchemas),
    }),
  ) as z.ZodType<ListInputValue<Entries>>;
}

function buildListOutputSchema<Entries extends readonly Entry[]>(
  fields: Entries,
) {
  const valueSchemas = fields.map((entry) => entry.field.getOutputSchema());

  return z.array(
    z.object({
      name: z.string(),
      value: unionSchemas(valueSchemas),
    }),
  ) as z.ZodType<ListOutputValue<Entries>>;
}

function unionSchemas(schemas: z.ZodTypeAny[]) {
  if (schemas.length === 0) {
    return z.never();
  }

  if (schemas.length === 1) {
    return schemas[0];
  }

  return z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
}
