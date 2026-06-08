import { ContentType, Fields } from "@rakun-kit/core";

export const Header = new ContentType({
  name: "Header",
  menu: {
    title: "Headers",
    icon: "PanelTop",
    category: "Layout",
  },
  fields: {
    brand: Fields.string().required(),
    primaryLinkLabel: Fields.string(),
    primaryLinkHref: Fields.string().type("Url"),
  },
  listFields: ["brand", "primaryLinkLabel"],
});

export const Footer = new ContentType({
  name: "Footer",
  menu: {
    title: "Footers",
    icon: "panel-bottom",
    category: "Layout",
  },
  fields: {
    brand: Fields.string().required(),
    copyright: Fields.string(),
    primaryLinkLabel: Fields.string(),
    primaryLinkHref: Fields.string().type("Url"),
  },
  listFields: ["brand", "copyright"],
});

export const PageSection = new ContentType({
  name: "PageSection",
  menu: {
    title: "Page sections",
    icon: "LayoutTemplate",
    category: "Blocks",
  },
  fields: {
    title: Fields.string().required().translatable(),
    body: Fields.string().type("RichText").translatable(),
  },
  listFields: ["title"],
});

export const Page = new ContentType({
  name: "Page",
  fields: {
    title: Fields.string().translatable().required(),
    slug: Fields.string().type("Slug").required().translatable(),
  },
  iterator: [{ contentType: PageSection, type: "existing" }],
  menu: {
    title: "Pages",
    icon: "FileText",
    category: "Content",
  },
  listFields: ["title", "slug"],
  uniques: [["slug"]],
});

export const Author = new ContentType({
  name: "Author",
  menu: {
    title: "Authors",
    icon: "user-round",
    category: "Editorial",
  },
  fields: {
    name: Fields.string().required(),
    email: Fields.string().type("Email"),
    bio: Fields.string().type("Textarea"),
  },
  listFields: ["name", "email"],
});

export const Article = new ContentType({
  name: "Article",
  menu: {
    title: "Articles",
    icon: "newspaper",
    category: "Editorial",
  },
  fields: {
    title: Fields.string().required(),
    slug: Fields.string().type("Slug").required(),
    excerpt: Fields.string().type("Textarea"),
    published: Fields.boolean(),
    author: Fields.relation(Author),
    body: Fields.string().type("RichText"),
    tags: Fields.array(Fields.string()),
  },
  uniques: [["slug"]],
  listFields: ["title", "slug", "published", "author.name"],
});

export const ConditionalDemo = new ContentType({
  name: "ConditionalDemo",
  menu: {
    title: "Conditional demos",
    icon: "ListChecks",
    category: "Development",
  },
  fields: {
    title: Fields.string().required(),
    intent: Fields.select(["basic", "advanced", "experimental"] as const).required(),
    advancedEnabled: Fields.boolean().condition({
      field: "intent",
      equals: "advanced",
    }),
    priority: Fields.number(),
    priorityNotes: Fields.string().type("Textarea").condition({
      field: "priority",
      gte: 5,
    }),
    flags: Fields.select(["featured", "sponsored", "archived"] as const).multiple(),
    featuredLabel: Fields.string().condition({
      field: "flags",
      includes: "featured",
    }),
    multiFlagSummary: Fields.string().type("Textarea").condition({
      field: "flags",
      length: { gte: 2 },
    }),
  },
  listFields: ["title", "intent", "priority"],
});

export const previewContentTypes = [
  Header,
  Footer,
  PageSection,
  Author,
  Article,
  ConditionalDemo,
];
