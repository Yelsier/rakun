import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DBOutput } from "../lib/types";

export const Seo = new ContentType({
  name: "Seo",
  fields: {
    title: Fields.string(),
    description: Fields.string().type("Textarea").translatable(),
  },
  listFields: ["title"],
}).hideFromManager();

export type Seo = typeof Seo;
export type SeoSchema = DataFront<Seo>;
export type SeoManager = DBOutput<Seo>;
