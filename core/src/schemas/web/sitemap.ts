import z from "zod";

export const sitemapInput = z.object({
  language: z.string().optional(),
});

export const sitemapLanguageOutput = z.object({
  code: z.string(),
});

export const sitemapItemOutput = z.object({
  path: z.string(),
  lastModified: z.date().optional(),
});

export const sitemapOutput = z.object({
  languages: z.array(sitemapLanguageOutput),
  items: z.array(sitemapItemOutput),
});

export type SitemapInput = z.input<typeof sitemapInput>;
export type SitemapLanguageOutput = z.output<typeof sitemapLanguageOutput>;
export type SitemapItemOutput = z.output<typeof sitemapItemOutput>;
export type SitemapOutput = z.output<typeof sitemapOutput>;
