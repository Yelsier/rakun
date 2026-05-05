import { throwAppError } from "../../lib/errors";
import { MaybeTranslatableValue, FlattenTranslate } from "../../lib/types";
import { translateObject } from "../../lib/utils/translateObject";
import { getLanguages } from "./getLanguages";

export const translate = async <
  T extends Record<string, MaybeTranslatableValue<unknown>>,
>(
  obj: T,
  lang: string,
): Promise<FlattenTranslate<T>> => {
  const languages = await getLanguages();
  const language = languages.find((l) => l.code === lang);
  if (!language) {
    throwAppError("NOT_FOUND", {
      id: lang,
      resource: "Language",
    });
  }

  return translateObject(obj, language, languages);
};
