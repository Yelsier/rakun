import { LanguageSchema } from "../../internal-content-types";
import { MaybeTranslatableValue } from "../types";
import { isTranslatableObject } from "./isTranslatableObject";

export const getTranslation = <T>(
  object: MaybeTranslatableValue<T>,
  language: LanguageSchema,
  languageList: LanguageSchema[],
): T => {
  if (!object) return object as T;
  if (!isTranslatableObject(object)) return object as T;

  if (Object.keys(object).length <= 1) return "" as unknown as T;

  const defaultLang = languageList.find((lang) => lang.default);

  const getTranslationRecursive = (langSearch: LanguageSchema): T => {
    if (object[langSearch.code]) return object[langSearch.code] as T;

    const parentLang = languageList.find(
      (lang) => lang._id === langSearch.parent?._id,
    );

    const fallbackUnkown = object[
      Object.keys(object).filter((key) => key !== "_tag")[0] as string
    ] as T;

    if (!parentLang) {
      return defaultLang
        ? object[defaultLang.code] || fallbackUnkown
        : fallbackUnkown;
    }

    return getTranslationRecursive(parentLang);
  };

  return getTranslationRecursive(language);
};
