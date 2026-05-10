import { ContentType, Fields } from "@rakun-kit/next";

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

export const previewContentTypes = [
  Header,
  Footer,
  PageSection,
  Author,
  Article,
];
