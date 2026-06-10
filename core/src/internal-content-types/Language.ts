import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DataInput, DBOutput } from "../lib/types";

export const Language = new ContentType({
  name: "Language",
  permissions: "Language",
  fields: {
    code: Fields.string().required().min(2),
    name: Fields.string().required(),
    default: Fields.boolean().required(),
    parent: Fields.selfRelation(),
  },
  uniques: [["code"]],
}).hideFromManager();

export type Language = typeof Language;
export type LanguageSchema = DataFront<Language>;
export type LanguageManager = DBOutput<Language>;
export type LanguageInput = DataInput<Language>;
