import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DBOutput } from "../lib/types";

export const LiteralTranslation = new ContentType({
  name: "LiteralTranslation",
  fields: {
    key: Fields.string().required(),
    locale: Fields.string().required().min(2),
    message: Fields.string().required(),
  },
  uniques: [["key", "locale"]],
}).hideFromManager();

export type LiteralTranslation = typeof LiteralTranslation;
export type LiteralTranslationSchema = DataFront<LiteralTranslation>;
export type LiteralTranslationManager = DBOutput<LiteralTranslation>;
