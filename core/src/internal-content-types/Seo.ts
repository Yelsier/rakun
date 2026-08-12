import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DBOutput } from "../lib/types";

export const Seo = new ContentType({
  name: "Seo",
  fields: {
    title: Fields.string().translatable().optional(),
    description: Fields.string().type("Textarea").translatable().optional(),
    canonicalUrl: Fields.string()
      .type("Url")
      .translatable()
      .description(
        "Leave empty to generate it from the SEO site URL and page route.",
      )
      .optional(),
    image: Fields.file().type("Image").optional(),
    imageAlt: Fields.string().translatable().optional(),
    noIndex: Fields.boolean().optional(),
    customOpenGraph: Fields.boolean().optional(),
    openGraphTitle: Fields.string()
      .translatable()
      .condition({ field: "customOpenGraph", equals: true })
      .optional(),
    openGraphDescription: Fields.string()
      .type("Textarea")
      .translatable()
      .condition({ field: "customOpenGraph", equals: true })
      .optional(),
    openGraphUrl: Fields.string()
      .type("Url")
      .translatable()
      .condition({ field: "customOpenGraph", equals: true })
      .optional(),
    openGraphSiteName: Fields.string()
      .translatable()
      .condition({ field: "customOpenGraph", equals: true })
      .optional(),
    openGraphType: Fields.select(["website", "article", "profile", "book"])
      .condition({ field: "customOpenGraph", equals: true })
      .optional(),
    openGraphImage: Fields.file()
      .type("Image")
      .condition({ field: "customOpenGraph", equals: true })
      .optional(),
    openGraphImageAlt: Fields.string()
      .translatable()
      .condition({ field: "customOpenGraph", equals: true })
      .optional(),
    customTwitter: Fields.boolean().optional(),
    twitterCard: Fields.select([
      "summary",
      "summary_large_image",
      "app",
      "player",
    ])
      .condition({ field: "customTwitter", equals: true })
      .optional(),
    twitterTitle: Fields.string()
      .translatable()
      .condition({ field: "customTwitter", equals: true })
      .optional(),
    twitterDescription: Fields.string()
      .type("Textarea")
      .translatable()
      .condition({ field: "customTwitter", equals: true })
      .optional(),
    twitterImage: Fields.file()
      .type("Image")
      .condition({ field: "customTwitter", equals: true })
      .optional(),
    twitterImageAlt: Fields.string()
      .translatable()
      .condition({ field: "customTwitter", equals: true })
      .optional(),
  },
  listFields: ["title"],
}).hideFromManager();

export type Seo = typeof Seo;
export type SeoSchema = DataFront<Seo>;
export type SeoManager = DBOutput<Seo>;
