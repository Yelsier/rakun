import z from "zod";
import { Seo, Language } from "../../internal-content-types";

export const pageInput = z.object({
  path: z.string(),
  search: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export const pageModule = z
  .object({
    // TODO: set enum of allowed module types
    _type: z.string(),
    _id: z.string(),
  })
  .catchall(z.unknown());

export const pageSeoOutput = z.intersection(
  Seo.getOutputSchema(),
  z.object({
    siteName: z.string().optional(),
    siteUrl: z.string().optional(),
    twitterSite: z.string().optional(),
    alternates: z.record(z.string(), z.string()).optional(),
  }),
);

export const pageOutput = z.object({
  renderMode: z.enum(["static", "dynamic"]),
  ttl: z.number().optional(),
  modules: z.array(pageModule),
  templateModuleIds: z.array(z.string()).optional(),
  layout: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("module"),
          key: z.string(),
          module: pageModule.nullable(),
        }),
        z.object({
          type: z.literal("content"),
          modules: z.array(pageModule),
        }),
      ]),
    )
    .optional(),
  seo: pageSeoOutput.optional(),
  language: Language.getOutputSchema().optional(),
  info: z.record(z.string(), z.unknown()).optional(),
  redirect: z
    .object({
      to: z.string(),
      status: z.number().int().min(300).max(399),
    })
    .optional(),
});

export type PageInput = z.infer<typeof pageInput>;
export type PageOutput = z.infer<typeof pageOutput>;
export type PageSeoOutput = z.infer<typeof pageSeoOutput>;
export type PageModule = z.infer<typeof pageModule>;
