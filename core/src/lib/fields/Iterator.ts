import z from "zod";

import ContentType from "../ContentType";
import { ListField } from "./List";
import { OnlyType, RelationField } from "./Relation";
import type { FieldHKT } from "../types";
import type { Entry } from "./List";

export type EntryContentType = { contentType: ContentType; type?: OnlyType };

type IteratorEntry<CT extends EntryContentType[]> = {
  name: CT[number]["contentType"]["name"];
  field: RelationField<CT[number]["contentType"], CT[number]["type"]>;
};

type IteratorSchema<CT extends EntryContentType[]> = z.ZodArray<
  z.ZodObject<
    {
      name: z.ZodString;
      value: z.ZodUnion<
        readonly [ReturnType<IteratorEntry<CT>["field"]["getSchema"]>]
      >;
    },
    z.core.$strip
  >
>;

type IteratorOutputSchema<CT extends EntryContentType[]> = z.ZodArray<
  z.ZodObject<
    {
      name: z.ZodString;
      value: z.ZodUnion<
        readonly [ReturnType<IteratorEntry<CT>["field"]["getOutputSchema"]>]
      >;
    },
    z.core.$strip
  >
>;

interface IteratorFieldHKT<
  CT extends EntryContentType[],
  S extends IteratorSchema<CT>,
  Sout extends IteratorOutputSchema<CT>,
> extends FieldHKT {
  type: IteratorField<
    CT,
    S,
    Sout,
    this["args"][1],
    this["args"][2],
    this["args"][3]
  >;
}

export class IteratorField<
  CT extends EntryContentType[],
  S extends IteratorSchema<CT> = IteratorSchema<CT>,
  Sout extends IteratorOutputSchema<CT> = IteratorOutputSchema<CT>,
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends "api" | "manager" | "all" = "all",
> extends ListField<
  IteratorEntry<CT>[],
  S,
  Sout,
  TRequired,
  TTranslatable,
  TVisibility,
  IteratorFieldHKT<CT, S, Sout>
> {
  constructor(fields: CT) {
    super(
      fields.map((f) => ({
        name: f.contentType.name,
        field: new RelationField(f.contentType, f.type),
      })) as IteratorEntry<CT>[] & Entry[],
    );
    this.config = { ui: "Iterator", type: "List" };
  }
}
