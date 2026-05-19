import { RouteMap } from "../../../internal-content-types";
import { getMongoService } from "../../../orm";
import type { SitemapInput, SitemapOutput } from "../../../schemas/web/sitemap";
import { getLanguages } from "../../utils/getLanguages";

export const getSitemap = async (
  input: SitemapInput = {},
): Promise<SitemapOutput> => {
  const db = await getMongoService();
  const languages = await getLanguages();
  const language = input.language
    ? languages.find((item) => item.code === input.language)
    : null;
  const outputLanguages = languages
    .map((item) => ({
      code: item.code,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  if (input.language && !language) {
    return {
      languages: outputLanguages,
      items: [],
    };
  }

  const { items } = await db.list(RouteMap, {
    options: {
      limit: "all",
      fields: ["path", "languageId", "lastModified", "createdAt", "updatedAt"],
    },
  });
  const filteredItems = language
    ? items.filter((item) => String(item.languageId) === String(language._id))
    : items;

  return {
    languages: outputLanguages,
    items: filteredItems
      .map((item) => ({
        path: item.path,
        lastModified: item.lastModified ?? item.updatedAt ?? item.createdAt,
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  };
};
