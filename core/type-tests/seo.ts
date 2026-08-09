import { f, type SeoStringField } from "../src";

const seoField = "title" satisfies SeoStringField;

f.string().seo(seoField).required();
f.string().required().seo("description");

// @ts-expect-error SEO bindings only accept string fields exposed by Seo.
f.string().seo("image");

// @ts-expect-error RichText stores an object rather than a string.
f.string().type("RichText").seo("title");
