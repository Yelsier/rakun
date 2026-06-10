import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DBOutput } from "../lib/types";
import { Seo } from "./Seo";

export const SeoSettings = new ContentType({
  name: "SeoSettings",
  permissions: "SeoSettings",
  fields: {
    key: Fields.string().required(),
    siteName: Fields.string().translatable(),
    siteUrl: Fields.string().type("Url"),
    titleTemplate: Fields.string().description(
      "Use %s where the page title should appear, for example %s | Site name. Leave empty to use the page title as-is.",
    ),
    twitterSite: Fields.string(),
    defaultSeo: Fields.relation(Seo, "new"),
  },
  uniques: [["key"]],
  listFields: ["key"],
}).hideFromManager();

export type SeoSettings = typeof SeoSettings;
export type SeoSettingsSchema = DataFront<SeoSettings>;
export type SeoSettingsManager = DBOutput<SeoSettings>;
