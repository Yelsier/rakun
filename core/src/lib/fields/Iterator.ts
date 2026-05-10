import { defaultFieldState } from "./Field";
import {
  makeListField,
  type Entry,
  type ListField,
} from "./List";
import {
  relationField,
  type ContentTypeLike,
  type OnlyType,
  type RelationField,
} from "./Relation";

export type EntryContentType<
  CT extends ContentTypeLike = ContentTypeLike,
  Only extends OnlyType = OnlyType,
> = {
  contentType: CT;
  type?: Only;
};

type IteratorEntry<Item> = Item extends {
  contentType: infer CT extends ContentTypeLike;
  type?: infer Only extends OnlyType;
}
  ? Entry<CT["name"], RelationField<CT, Only>>
  : never;

type IteratorEntries<Items extends readonly EntryContentType[]> = {
  [K in keyof Items]: IteratorEntry<Items[K]>;
};

export type IteratorField<
  Items extends readonly EntryContentType[] = readonly EntryContentType[],
> = ListField<IteratorEntries<Items>>;

export function iteratorField<const Items extends readonly EntryContentType[]>(
  fields: Items,
): IteratorField<Items> {
  const entries = fields.map((entry) => ({
    name: entry.contentType.name,
    field: relationField(entry.contentType, entry.type),
  })) as IteratorEntries<Items>;

  return makeListField(
    { fields: entries, ui: "Iterator" },
    defaultFieldState,
  ) as IteratorField<Items>;
}
