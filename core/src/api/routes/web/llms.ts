import type { LanguageSchema } from "../../../internal-content-types/Language";
import {
  LlmsSettings,
  SeoSettings,
} from "../../../internal-content-types";
import type { DBOutput } from "../../../lib/types";
import { getTranslation } from "../../../lib/utils/getTranslation";
import { isTranslatableObject } from "../../../lib/utils/isTranslatableObject";
import { getMongoService } from "../../../orm";
import type { LlmsInput, LlmsOutput } from "../../../schemas/web/llms";
import { getLanguages } from "../../utils/getLanguages";
import { populateLinks } from "../../utils/populates/populateLinks";

type UnknownRecord = Record<string, unknown>;

export type LlmsRenderedEntry = {
  href: string;
  title: string;
  description?: string;
};

export type LlmsRenderedSection = {
  title: string;
  optional?: boolean;
  entries: LlmsRenderedEntry[];
};

export type LlmsRenderedDocument = {
  title: string;
  summary?: string;
  details?: string;
  sections: LlmsRenderedSection[];
};

const isRecord = (value: unknown): value is UnknownRecord =>
  !!value && typeof value === "object" && !Array.isArray(value);

const unwrapRelation = (value: unknown): UnknownRecord | undefined => {
  if (!isRecord(value)) return undefined;
  if (value.type === "new" && isRecord(value.data)) return value.data;
  return value;
};

const getBlockValues = (value: unknown, name: string): UnknownRecord[] =>
  Array.isArray(value)
    ? value.flatMap((item) => {
        if (!isRecord(item) || item.name !== name) return [];
        const relation = unwrapRelation(item.value);
        return relation ? [relation] : [];
      })
    : [];

const normalizeInline = (value: string) =>
  value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

const escapeLabel = (value: string) =>
  normalizeInline(value).replace(/([\\\[\]])/g, "\\$1");

const normalizeDetails = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => (line.trimStart().startsWith("#") ? `\\${line}` : line))
    .join("\n")
    .trim();

const escapeHref = (value: string) =>
  value.replace(/\(/g, "%28").replace(/\)/g, "%29");

const renderEntry = (entry: LlmsRenderedEntry) => {
  const description = entry.description
    ? `: ${normalizeInline(entry.description)}`
    : "";
  return `- [${escapeLabel(entry.title)}](${entry.href})${description}`;
};

const normalizeHref = (href: string, siteUrl?: string) => {
  const value = href.trim();
  if (!value) return undefined;

  try {
    const url = siteUrl ? new URL(value, siteUrl) : new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return escapeHref(url.toString());
  } catch {
    if (!value.startsWith("/")) return undefined;
    return escapeHref(value.replace(/\s/g, "%20"));
  }
};

export const renderLlmsTxt = (
  document: LlmsRenderedDocument,
): string | undefined => {
  const title = normalizeInline(document.title).replace(/^#+\s*/, "");
  if (!title) return undefined;

  const lines = [`# ${title}`];
  const summary = document.summary && normalizeInline(document.summary);
  if (summary) lines.push("", `> ${summary}`);

  const details = document.details && normalizeDetails(document.details);
  if (details) lines.push("", details);

  const optionalSections: LlmsRenderedSection[] = [];
  for (const section of document.sections) {
    if (section.optional) {
      optionalSections.push(section);
      continue;
    }

    const sectionTitle = normalizeInline(section.title).replace(/^#+\s*/, "");
    if (!sectionTitle) continue;

    lines.push("", `## ${sectionTitle}`);
    for (const entry of section.entries) {
      lines.push(renderEntry(entry));
    }
  }

  const visibleOptionalSections = optionalSections.flatMap((section) => {
    const title = normalizeInline(section.title).replace(/^#+\s*/, "");
    return title || section.entries.length > 0 ? [{ ...section, title }] : [];
  });
  if (visibleOptionalSections.length > 0) {
    lines.push("", "## Optional");
    for (const section of visibleOptionalSections) {
      if (section.title) lines.push("", `### ${section.title}`);
      for (const entry of section.entries) {
        lines.push(renderEntry(entry));
      }
    }
  }

  return `${lines.join("\n")}\n`;
};

const getLocalizedValue = (
  value: unknown,
  language: LanguageSchema,
  languages: LanguageSchema[],
): unknown =>
  isTranslatableObject(value)
    ? getTranslation(value, language, languages)
    : value;

const getLocalizedString = (
  value: unknown,
  language: LanguageSchema,
  languages: LanguageSchema[],
) => {
  const localized = getLocalizedValue(value, language, languages);
  return typeof localized === "string" ? localized.trim() : "";
};

const getDefaultSeo = (settings: UnknownRecord | undefined) =>
  unwrapRelation(settings?.defaultSeo);

const buildRenderedEntry = ({
  entry,
  language,
  languages,
  siteUrl,
}: {
  entry: UnknownRecord;
  language: LanguageSchema;
  languages: LanguageSchema[];
  siteUrl?: string;
}): LlmsRenderedEntry | undefined => {
  const localizedLink = getLocalizedValue(
    entry.llmsLink,
    language,
    languages,
  );
  const link = isRecord(localizedLink) ? localizedLink : undefined;
  const rawHref = link
    ? getLocalizedValue(link.href, language, languages)
    : localizedLink;
  const href =
    typeof rawHref === "string" ? normalizeHref(rawHref, siteUrl) : undefined;
  if (!href) return undefined;

  const title =
    getLocalizedString(entry.llmsLinkTitle, language, languages) ||
    (link ? getLocalizedString(link.title, language, languages) : "") ||
    href;
  const description = getLocalizedString(
    entry.llmsLinkDescription,
    language,
    languages,
  );

  return {
    href,
    title,
    ...(description ? { description } : {}),
  };
};

export const getLlmsTxt = async (
  input: LlmsInput = {},
): Promise<LlmsOutput> => {
  const db = await getMongoService();
  const [settingsRaw, seoSettingsRaw, languageRecords] = await Promise.all([
    db.find(LlmsSettings, { key: "default" }),
    db.find(SeoSettings, { key: "default" }),
    getLanguages(),
  ]);
  if (!settingsRaw || settingsRaw.llmsEnabled !== true) return null;

  const languages = languageRecords as LanguageSchema[];
  const language = input.language
    ? languages.find((item) => item.code === input.language)
    : languages.find((item) => item.default) ?? languages[0];
  if (!language) return null;

  const populated = (await populateLinks(
    settingsRaw as DBOutput<typeof LlmsSettings>,
  )) as unknown as UnknownRecord;
  const seoSettings = seoSettingsRaw as unknown as UnknownRecord | undefined;
  const defaultSeo = getDefaultSeo(seoSettings);
  const siteUrl =
    typeof seoSettings?.siteUrl === "string"
      ? seoSettings.siteUrl
      : undefined;
  const title =
    getLocalizedString(populated.llmsTitle, language, languages) ||
    getLocalizedString(seoSettings?.siteName, language, languages);
  const summary =
    getLocalizedString(populated.llmsSummary, language, languages) ||
    getLocalizedString(defaultSeo?.description, language, languages);
  const details = getLocalizedString(
    populated.llmsDetails,
    language,
    languages,
  );
  const sections = getBlockValues(populated.llmsSections, "LlmsSection").map(
    (section) => ({
      title: getLocalizedString(
        section.llmsSectionTitle,
        language,
        languages,
      ),
      optional: section.llmsOptional === true,
      entries: getBlockValues(section.llmsEntries, "LlmsEntry").flatMap(
        (entry) => {
          const rendered = buildRenderedEntry({
            entry,
            language,
            languages,
            siteUrl,
          });
          return rendered ? [rendered] : [];
        },
      ),
    }),
  );
  const content = renderLlmsTxt({
    title,
    summary: summary || undefined,
    details: details || undefined,
    sections,
  });

  return content ? { content, language: language.code } : null;
};
