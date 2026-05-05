import type ContentType from "../ContentType";
import { BooleanField } from "./Boolean";
import { ContentReferenceField } from "./ContentReference";
import { DateField } from "./Date";
import { Field } from "./Field";
import { EntryContentType, IteratorField } from "./Iterator";
import { LinkField } from "./Link";
import { FileField } from "./File";
import type { Entry } from "./List";
import { ListField } from "./List";
import { NumberField } from "./Number";
import type { OnlyType } from "./Relation";
import { RelationField } from "./Relation";
import { SelectField } from "./Select";
import { SelfRelationField } from "./SelfRelation";
import { SimpleListField } from "./SimpleList";
import { StringField } from "./String";

export const Fields = {
  string: () => new StringField(),
  relation: <CT extends ContentType, const X extends OnlyType = undefined>(
    contentType: CT,
    only?: X,
  ) => new RelationField(contentType, only),
  contentReference: <const N extends string>(contentType: N) =>
    new ContentReferenceField(contentType),
  selfRelation: () => new SelfRelationField(),
  number: () => new NumberField(),
  boolean: () => new BooleanField(),
  link: () => new LinkField(),
  file: () => new FileField(),
  date: () => new DateField(),
  select: <const L extends string[] = string[]>(options: L) =>
    new SelectField(options),
  iterator: <CT extends EntryContentType[]>(fields: CT) =>
    new IteratorField(fields),
  /**
   * Ordered list where each item can be one of several named field shapes.
   * Use this for block-like heterogeneous content.
   */
  blocks: <T extends Entry[]>(fields: T) => new ListField<T>(fields),
  /**
   * Ordered list where every item has the same field shape.
   * Used by multi-value fields such as relation `.multiple()`.
   */
  array: <F extends Field<any, any, any, any, any, any>>(field: F) =>
    new SimpleListField(field),
};
