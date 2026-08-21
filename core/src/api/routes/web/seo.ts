import type { PageSeoOutput } from "../../../schemas/web/page";
import { isRecord } from "../../../lib/utils/isRecord";

type SeoRecord = Record<string, unknown>;

type ResolveSeoInput = {
  pageSeo?: SeoRecord | null;
  defaultSeo?: SeoRecord | null;
  settings?: {
    siteName?: unknown;
    siteUrl?: unknown;
    titleTemplate?: unknown;
    twitterSite?: unknown;
  } | null;
  alternatePaths?: Record<string, string>;
  path: string;
};

const seoKeys = [
  "_id",
  "_type",
  "_schemaVersion",
  "_visibility",
  "_visibilityBeforeTrash",
  "_trashed",
  "trashedAt",
  "_revision",
  "createdAt",
  "updatedAt",
  "title",
  "description",
  "canonicalUrl",
  "image",
  "imageAlt",
  "noIndex",
  "customOpenGraph",
  "openGraphTitle",
  "openGraphDescription",
  "openGraphUrl",
  "openGraphSiteName",
  "openGraphType",
  "openGraphImage",
  "openGraphImageAlt",
  "customTwitter",
  "twitterCard",
  "twitterTitle",
  "twitterDescription",
  "twitterImage",
  "twitterImageAlt",
] as const;

const isEmptySeoValue = (value: unknown) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
};

const firstSeoValue = <T>(...values: unknown[]): T | undefined => {
  const found = values.find((value) => !isEmptySeoValue(value));
  return found as T | undefined;
};

const mergeSeo = (
  defaultSeo?: SeoRecord | null,
  pageSeo?: SeoRecord | null,
): SeoRecord => {
  const output: SeoRecord = {};

  for (const key of seoKeys) {
    const pageValue = pageSeo?.[key];
    const defaultValue = defaultSeo?.[key];

    if (!isEmptySeoValue(pageValue)) {
      output[key] = pageValue;
      continue;
    }

    if (!isEmptySeoValue(defaultValue)) {
      output[key] = defaultValue;
    }
  }

  return output;
};

export const applyTitleTemplate = (
  title: string | undefined,
  template: unknown,
): string | undefined => {
  if (!title) return title;
  if (typeof template !== "string" || template.trim().length === 0) {
    return title;
  }

  return template.includes("%s")
    ? template.replace(/%s/g, title)
    : `${title} ${template}`;
};

export const resolveSeoUrl = (
  siteUrl: unknown,
  path: string,
): string | undefined => {
  if (typeof siteUrl !== "string" || siteUrl.trim().length === 0) {
    return undefined;
  }

  try {
    return new URL(
      path,
      siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`,
    ).toString();
  } catch (_) {
    return undefined;
  }
};

const resolveSeoAlternates = (
  siteUrl: unknown,
  alternatePaths?: Record<string, string>,
): Record<string, string> | undefined => {
  if (!alternatePaths) return undefined;

  const entries = Object.entries(alternatePaths)
    .map(([language, path]) => {
      const url = resolveSeoUrl(siteUrl, path);
      return url ? ([language, url] as const) : null;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null)
    .sort(([a], [b]) => a.localeCompare(b));

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

export const resolveSeo = ({
  pageSeo,
  defaultSeo,
  settings,
  alternatePaths,
  path,
}: ResolveSeoInput): PageSeoOutput | undefined => {
  const merged = mergeSeo(defaultSeo, pageSeo);

  if (!isRecord(merged) || !merged._type || !merged._id) {
    return undefined;
  }

  const siteName = firstSeoValue<string>(settings?.siteName);
  const siteUrl = firstSeoValue<string>(settings?.siteUrl);
  const twitterSite = firstSeoValue<string>(settings?.twitterSite);
  const pageTitle = firstSeoValue<string>(pageSeo?.title);
  const title = pageTitle
    ? applyTitleTemplate(pageTitle, settings?.titleTemplate)
    : firstSeoValue<string>(merged.title);
  const description = firstSeoValue<string>(merged.description);
  const canonicalUrl =
    firstSeoValue<string>(merged.canonicalUrl) ?? resolveSeoUrl(siteUrl, path);
  const alternates = resolveSeoAlternates(siteUrl, alternatePaths);
  const customOpenGraph = merged.customOpenGraph === true;
  const customTwitter = merged.customTwitter === true;
  const image = firstSeoValue(merged.image);
  const imageAlt = firstSeoValue<string>(merged.imageAlt);
  const openGraphImage = customOpenGraph
    ? firstSeoValue(merged.openGraphImage, image)
    : image;
  const openGraphImageAlt = customOpenGraph
    ? firstSeoValue<string>(merged.openGraphImageAlt, imageAlt)
    : imageAlt;
  const twitterImage = customTwitter
    ? firstSeoValue(merged.twitterImage, image)
    : image;
  const twitterImageAlt = customTwitter
    ? firstSeoValue<string>(merged.twitterImageAlt, imageAlt)
    : imageAlt;

  return {
    ...merged,
    title,
    description,
    canonicalUrl,
    alternates,
    siteName,
    siteUrl,
    twitterSite,
    image,
    imageAlt,
    customOpenGraph,
    openGraphTitle: customOpenGraph
      ? firstSeoValue<string>(merged.openGraphTitle, title)
      : title,
    openGraphDescription: customOpenGraph
      ? firstSeoValue<string>(merged.openGraphDescription, description)
      : description,
    openGraphUrl: customOpenGraph
      ? firstSeoValue<string>(merged.openGraphUrl, canonicalUrl)
      : canonicalUrl,
    openGraphSiteName: customOpenGraph
      ? firstSeoValue<string>(merged.openGraphSiteName, siteName)
      : siteName,
    openGraphType: customOpenGraph
      ? firstSeoValue<string>(merged.openGraphType, "website")
      : "website",
    openGraphImage,
    openGraphImageAlt,
    customTwitter,
    twitterCard: customTwitter
      ? firstSeoValue<string>(
          merged.twitterCard,
          twitterImage ? "summary_large_image" : "summary",
        )
      : twitterImage
        ? "summary_large_image"
        : "summary",
    twitterTitle: customTwitter
      ? firstSeoValue<string>(merged.twitterTitle, title)
      : title,
    twitterDescription: customTwitter
      ? firstSeoValue<string>(merged.twitterDescription, description)
      : description,
    twitterImage,
    twitterImageAlt,
  } as PageSeoOutput;
};
