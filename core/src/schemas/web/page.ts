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

export const pageOutput = z.object({
  renderMode: z.enum(["static", "dynamic"]),
  ttl: z.number().optional(),
  modules: z.array(pageModule),
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
  seo: Seo.getOutputSchema().optional(),
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
export type PageModule = z.infer<typeof pageModule>;
