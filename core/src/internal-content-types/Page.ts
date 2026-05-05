import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";

export const Page = new ContentType({
  name: "Page",
  fields: {
    title: Fields.string().translatable().required(),
    slug: Fields.string().type("Slug").required().translatable(),
  },
  menu: {
    title: "Pages",
  },
  listFields: ["title", "slug"],
  uniques: [["slug"]],
});

export type Page = typeof Page;
