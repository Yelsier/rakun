import { ContentType, Fields } from "@rakun-kit/core";

export const Header = new ContentType({
  name: "Header",
  menu: {
    title: "preview.contentTypes.header.menu",
    icon: "PanelTop",
    category: "preview.contentTypes.category.layout",
  },
  fields: {
    brand: Fields.string().required(),
    primaryLinkLabel: Fields.string().optional(),
    primaryLinkHref: Fields.string().type("Url").optional(),
  },
  listFields: ["brand", "primaryLinkLabel"],
});

export const Footer = new ContentType({
  name: "Footer",
  menu: {
    title: "preview.contentTypes.footer.menu",
    icon: "panel-bottom",
    category: "preview.contentTypes.category.layout",
  },
  fields: {
    brand: Fields.string().required(),
    copyright: Fields.string().optional(),
    primaryLinkLabel: Fields.string().optional(),
    primaryLinkHref: Fields.string().type("Url").optional(),
  },
  listFields: ["brand", "copyright"],
});

export const PageSection = new ContentType({
  name: "PageSection",
  menu: {
    title: "preview.contentTypes.pageSection.menu",
    icon: "LayoutTemplate",
    category: "preview.contentTypes.category.blocks",
  },
  fields: {
    title: Fields.string().required().translatable(),
    body: Fields.string().type("RichText").translatable().optional(),
  },
  listFields: ["title"],
});

export const Page = new ContentType({
  name: "Page",
  permissions: "Page",
  fields: {
    title: Fields.string().translatable().required(),
    slug: Fields.string().type("Slug").required().translatable(),
  },
  iterator: [{ contentType: PageSection, type: "existing" }],
  menu: {
    title: "preview.contentTypes.page.menu",
    icon: "FileText",
    category: "preview.contentTypes.category.content",
  },
  listFields: ["title", "slug"],
  uniques: [["slug"]],
});

export const Author = new ContentType({
  name: "Author",
  menu: {
    title: "preview.contentTypes.author.menu",
    icon: "user-round",
    category: "preview.contentTypes.category.editorial",
  },
  fields: {
    name: Fields.string().required(),
    email: Fields.string().type("Email").optional(),
    bio: Fields.string().type("Textarea").optional(),
  },
  listFields: ["name", "email"],
});

export const Article = new ContentType({
  name: "Article",
  menu: {
    title: "preview.contentTypes.article.menu",
    icon: "newspaper",
    category: "preview.contentTypes.category.editorial",
  },
  fields: {
    title: Fields.string().required(),
    slug: Fields.string().type("Slug").required(),
    excerpt: Fields.string().type("Textarea").optional(),
    published: Fields.boolean().optional(),
    author: Fields.relation(Author).optional(),
    body: Fields.string().type("RichText").optional(),
    tags: Fields.array(Fields.string()).optional(),
  },
  uniques: [["slug"]],
  listFields: ["title", "slug", "published", "author.name"],
});

export const ConditionalDemo = new ContentType({
  name: "ConditionalDemo",
  menu: {
    title: "preview.contentTypes.conditionalDemo.menu",
    icon: "ListChecks",
    category: "preview.contentTypes.category.development",
  },
  fields: {
    title: Fields.string().required(),
    intent: Fields.select(["basic", "advanced", "experimental"] as const).required(),
    advancedEnabled: Fields.boolean().condition({
      field: "intent",
      equals: "advanced",
    }).optional(),
    priority: Fields.number().optional(),
    priorityNotes: Fields.string().type("Textarea").condition({
      field: "priority",
      gte: 5,
    }).optional(),
    flags: Fields.select(["featured", "sponsored", "archived"] as const)
      .optional()
      .multiple(),
    featuredLabel: Fields.string().condition({
      field: "flags",
      includes: "featured",
    }).optional(),
    multiFlagSummary: Fields.string().type("Textarea").condition({
      field: "flags",
      length: { gte: 2 },
    }).optional(),
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
