import { LanguageSchema } from "../../internal-content-types";
import { FlattenTranslate, MaybeTranslatableValue } from "../types";
import { getTranslation } from "./getTranslation";
import { hasKeys } from "./hasKeys";
import { isTranslatableObject } from "./isTranslatableObject";

export const translateObject = <
  T extends Record<string, MaybeTranslatableValue<unknown>>,
>(
  obj: T,
  language: LanguageSchema,
  languages: LanguageSchema[],
): FlattenTranslate<T> => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (isTranslatableObject(value)) {
        return [key, getTranslation(value, language, languages)];
      }
      // If value is a plain object (not null, not array, not function), recurse
      if (value && hasKeys(value)) {
        return [key, translateObject(value as T, language, languages)];
      }

      if (Array.isArray(value)) {
        return [
          key,
          value.map((item) =>
            typeof item === "object" && item !== null
              ? translateObject(item as T, language, languages)
              : item,
          ),
        ];
      }

      return [key, value];
    }),
  ) as FlattenTranslate<T>;
};
