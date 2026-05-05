import { expect, it } from "vitest";

import { getTranslation } from "./getTranslation";
import { LanguageSchema } from "../../internal-content-types";

const createLanguage = (
  code: string,
  isDefault = false,
  parent?: LanguageSchema,
): LanguageSchema => ({
  _id: `${code}-id`,
  code,
  name: code.toUpperCase(),
  default: isDefault,
  parent: parent
    ? { type: "self" as const, _id: parent._id, contentType: "Language" }
    : undefined,
  _type: "Language",
});

it("returns non-translatable object as-is", () => {
  const languages: LanguageSchema[] = [createLanguage("en", true)];
  const currentLanguage = languages[0]!;
  const nonTranslatableObject = "Hello World";

  const result = getTranslation(
    nonTranslatableObject,
    currentLanguage,
    languages,
  );

  expect(result).toBe("Hello World");
});

it("returns null/undefined as-is", () => {
  const languages: LanguageSchema[] = [createLanguage("en", true)];
  const currentLanguage = languages[0]!;

  const resultNull = getTranslation(null, currentLanguage, languages);
  const resultUndefined = getTranslation(undefined, currentLanguage, languages);

  expect(resultNull).toBe(null);
  expect(resultUndefined).toBe(undefined);
});

it("returns exact language match from translatable object", () => {
  const languages: LanguageSchema[] = [
    createLanguage("en", true),
    createLanguage("es"),
    createLanguage("fr"),
  ];
  const currentLanguage = languages[1]!; // Spanish
  const translatableObject = {
    _tag: "Translatable" as const,
    en: "Hello",
    es: "Hola",
    fr: "Bonjour",
  };

  const result = getTranslation(translatableObject, currentLanguage, languages);

  expect(result).toBe("Hola");
});

it("falls back to parent language when current language not found", () => {
  const englishLang = createLanguage("en", true);
  const spanishLang = createLanguage("es");
  const mexicanLang = createLanguage("es-MX", false, spanishLang);

  const languages: LanguageSchema[] = [englishLang, spanishLang, mexicanLang];
  const currentLanguage = mexicanLang;
  const translatableObject = {
    _tag: "Translatable" as const,
    en: "Hello",
    es: "Hola",
    // es-MX is missing, should fall back to es
  };

  const result = getTranslation(translatableObject, currentLanguage, languages);

  expect(result).toBe("Hola");
});

it("falls back to default language when no parent chain matches", () => {
  const englishLang = createLanguage("en", true);
  const frenchLang = createLanguage("fr");
  const spanishLang = createLanguage("es");

  const languages: LanguageSchema[] = [englishLang, frenchLang, spanishLang];
  const currentLanguage = frenchLang;
  const translatableObject = {
    _tag: "Translatable" as const,
    en: "Hello",
    es: "Hola",
    // fr is missing, should fall back to default (en)
  };

  const result = getTranslation(translatableObject, currentLanguage, languages);

  expect(result).toBe("Hello");
});

it("falls back to first available key when no default language exists", () => {
  const languages: LanguageSchema[] = [
    createLanguage("en"), // no default
    createLanguage("es"),
    createLanguage("fr"),
  ];
  const currentLanguage = languages[2]!; // French
  const translatableObject = {
    _tag: "Translatable" as const,
    en: "Hello",
    es: "Hola",
    // fr is missing, no default language, should fall back to first key (en)
  };

  const result = getTranslation(translatableObject, currentLanguage, languages);

  expect(result).toBe("Hello");
});

it("handles complex parent chain fallback", () => {
  const englishLang = createLanguage("en", true);
  const spanishLang = createLanguage("es");
  const mexicanLang = createLanguage("es-MX", false, spanishLang);
  const guadalajaraLang = createLanguage("es-MX-GDL", false, mexicanLang);

  const languages: LanguageSchema[] = [
    englishLang,
    spanishLang,
    mexicanLang,
    guadalajaraLang,
  ];
  const currentLanguage = guadalajaraLang;
  const translatableObject = {
    _tag: "Translatable" as const,
    en: "Hello",
    es: "Hola",
    // es-MX-GDL and es-MX are missing, should fall back to es
  };

  const result = getTranslation(translatableObject, currentLanguage, languages);

  expect(result).toBe("Hola");
});

it("returns default language value when present but requested language missing", () => {
  const englishLang = createLanguage("en", true);
  const germanLang = createLanguage("de");

  const languages: LanguageSchema[] = [englishLang, germanLang];
  const currentLanguage = germanLang;
  const translatableObject = {
    _tag: "Translatable" as const,
    en: "Hello",
    // de is missing, should fall back to default (en)
  };

  const result = getTranslation(translatableObject, currentLanguage, languages);

  expect(result).toBe("Hello");
});

it("handles empty translatable object gracefully", () => {
  const languages: LanguageSchema[] = [createLanguage("en", true)];
  const currentLanguage = languages[0]!;
  const translatableObject = {
    _tag: "Translatable" as const,
  };

  const result = getTranslation(translatableObject, currentLanguage, languages);

  expect(result).toBe("");
});
