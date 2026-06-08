import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DBOutput } from "../lib/types";

export const Seo = new ContentType({
  name: "Seo",
  fields: {
    title: Fields.string().translatable(),
    description: Fields.string().type("Textarea").translatable(),
    canonicalUrl: Fields.string()
      .type("Url")
      .translatable()
      .description(
        "Leave empty to generate it from the SEO site URL and page route.",
      ),
    image: Fields.file().type("Image"),
    imageAlt: Fields.string().translatable(),
    noIndex: Fields.boolean(),
    customOpenGraph: Fields.boolean(),
    openGraphTitle: Fields.string()
      .translatable()
      .condition({ field: "customOpenGraph", equals: true }),
    openGraphDescription: Fields.string()
      .type("Textarea")
      .translatable()
      .condition({ field: "customOpenGraph", equals: true }),
    openGraphUrl: Fields.string()
      .type("Url")
      .translatable()
      .condition({ field: "customOpenGraph", equals: true }),
    openGraphSiteName: Fields.string()
      .translatable()
      .condition({ field: "customOpenGraph", equals: true }),
    openGraphType: Fields.select(["website", "article", "profile", "book"])
      .condition({ field: "customOpenGraph", equals: true }),
    openGraphImage: Fields.file()
      .type("Image")
      .condition({ field: "customOpenGraph", equals: true }),
    openGraphImageAlt: Fields.string()
      .translatable()
      .condition({ field: "customOpenGraph", equals: true }),
    customTwitter: Fields.boolean(),
    twitterCard: Fields.select([
      "summary",
      "summary_large_image",
      "app",
      "player",
    ]).condition({ field: "customTwitter", equals: true }),
    twitterTitle: Fields.string()
      .translatable()
      .condition({ field: "customTwitter", equals: true }),
    twitterDescription: Fields.string()
      .type("Textarea")
      .translatable()
      .condition({ field: "customTwitter", equals: true }),
    twitterImage: Fields.file()
      .type("Image")
      .condition({ field: "customTwitter", equals: true }),
    twitterImageAlt: Fields.string()
      .translatable()
      .condition({ field: "customTwitter", equals: true }),
  },
  listFields: ["title"],
}).hideFromManager();

export type Seo = typeof Seo;
export type SeoSchema = DataFront<Seo>;
export type SeoManager = DBOutput<Seo>;
